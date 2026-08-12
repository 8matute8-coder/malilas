import React, { useState } from 'react';
import { useInventory } from '../hooks/useInventory';
import { useOrders } from '../hooks/useOrders';
import { getProductImage } from '../utils/productImages';
import { useActiveVisitors } from '../hooks/useActiveVisitors';

const FRUTAS_LIST = [
  'mandarina', 'manzana', 'pera', 'banana', 'limón', 'limon', 'pomelo', 'naranja', 
  'palta', 'frutilla', 'durazno', 'ciruela', 'uva', 'kiwi', 'melon', 'melón', 
  'sandia', 'sandía', 'anana', 'ananá', 'mango', 'arandano', 'arándano', 'higo', 
  'cereza', 'damasco', 'pelon', 'pelón', 'frambuesa', 'mora'
];

export default function Tienda() {
  useActiveVisitors(true); // Heartbeat activo para clientes en la tienda
  const { products } = useInventory();
  const { addOrder } = useOrders();
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [view, setView] = useState('catalog'); // 'catalog' | 'cart'

  // Modal State for adding items to Cart
  const [modalProduct, setModalProduct] = useState(null);
  const [modalQty, setModalQty] = useState(0);

  const [customerInfo, setCustomerInfo] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    notas: ''
  });

  const formatPrice = (num) => Math.round(num).toLocaleString('es-AR');
  const formatQuantity = (num) => Number(num.toFixed(2)).toString().replace('.', ',');

  const isFruit = (nombre) => FRUTAS_LIST.some(f => nombre.toLowerCase().includes(f));

  const availableProducts = products
    .filter(p => p.stockActual > 0)
    .filter(p => {
      const matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
      if (selectedCategory === '🔥 Ofertas') return Boolean(p.esOferta);
      if (selectedCategory === 'Frutas') return isFruit(p.nombre);
      if (selectedCategory === 'Verduras') return !isFruit(p.nombre);
      return true;
    })
    .sort((a, b) => (b.esOferta ? 1 : 0) - (a.esOferta ? 1 : 0) || a.nombre.localeCompare(b.nombre));

  const getCartQuantity = (productId) => {
    const item = cart.find(i => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const openAddModal = (product) => {
    setModalProduct(product);
    let initial = 1;
    if (product.tipoVenta === 'kg') initial = 1;
    if (product.tipoVenta === 'grs') initial = 250;
    setModalQty(initial);
  };

  const addPresetToModal = (amount) => {
    setModalQty(prev => {
      const current = parseFloat(prev) || 0;
      return Number((current + amount).toFixed(2));
    });
  };

  const addPresetToItem = (productId, amount) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;
    const current = parseFloat(item.quantity) || 0;
    updateCart(item.product, Number((current + amount).toFixed(2)));
  };

  const getModalPrice = () => {
    if (!modalProduct) return 0;
    const qty = parseFloat(modalQty) || 0;
    if (modalProduct.esOferta && qty === parseFloat(modalProduct.cantidadOferta)) {
      return Math.round(modalProduct.precioOferta);
    }
    if (modalProduct.tipoVenta === 'grs') {
      return Math.round((qty / 100) * modalProduct.precioVenta);
    }
    return Math.round(qty * modalProduct.precioVenta);
  };

  const handleConfirmAddFromModal = () => {
    if (!modalProduct || modalQty <= 0) return;

    const existing = cart.find(item => item.product.id === modalProduct.id);
    if (existing) {
      updateCart(modalProduct, (parseFloat(existing.quantity) || 0) + parseFloat(modalQty));
    } else {
      setCart([...cart, { product: modalProduct, quantity: parseFloat(modalQty), price: modalProduct.precioVenta }]);
    }

    setModalProduct(null);
  };

  const updateCart = (product, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(i => i.product.id !== product.id));
    } else {
      const qty = Math.min(newQuantity, product.stockActual);
      const itemExists = cart.find(i => i.product.id === product.id);

      if (itemExists) {
        setCart(cart.map(i => i.product.id === product.id ? { ...i, quantity: qty } : i));
      } else {
        setCart([...cart, { product, quantity: qty, price: product.precioVenta }]);
      }
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(i => i.product.id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      if (item.product.esOferta && item.quantity === parseFloat(item.product.cantidadOferta)) {
        return total + item.product.precioOferta;
      }
      if (item.product.tipoVenta === 'grs') {
        return total + ((item.quantity / 100) * item.price);
      }
      return total + (item.quantity * item.price);
    }, 0);
  };

  const handleCheckout = (e) => {
    e.preventDefault();
    if (cart.length === 0) return alert('El carrito está vacío.');
    if (!customerInfo.nombre || !customerInfo.direccion) {
      return alert('Por favor completa tu nombre y dirección para realizar el envío.');
    }

    const total = calculateTotal();

    // Guardar en Firestore para que aparezca instantáneamente en la pantalla de Delivery del local
    addOrder({
      cliente: customerInfo.nombre,
      direccion: customerInfo.direccion,
      telefono: customerInfo.telefono,
      notas: customerInfo.notas,
      items: cart,
      total: total
    });

    // Armar mensaje de WhatsApp
    let mensaje = `*NUEVO PEDIDO WEB - LA MALILA* 🛒\n\n`;
    mensaje += `*Cliente:* ${customerInfo.nombre}\n`;
    mensaje += `*Dirección:* ${customerInfo.direccion}\n`;
    if (customerInfo.telefono) mensaje += `*Teléfono:* ${customerInfo.telefono}\n`;
    if (customerInfo.notas) mensaje += `*Notas:* ${customerInfo.notas}\n\n`;

    mensaje += `*DETALLE DEL PEDIDO:* \n`;
    cart.forEach(item => {
      const unit = item.product.tipoVenta === 'unidad' ? 'un' : item.product.tipoVenta === 'grs' ? 'grs' : 'kg';
      mensaje += `• ${formatQuantity(item.quantity)} ${unit} x ${item.product.nombre}\n`;
    });

    mensaje += `\n*TOTAL A PAGAR: $${formatPrice(total)}*`;

    const numeroWhatsApp = "5493814751814"; // Número de WhatsApp del negocio (3814751814)
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;

    window.open(url, '_blank');

    alert('¡Tu pedido ha sido enviado con éxito! Recibirás confirmación por WhatsApp.');
    setCart([]);
    setCustomerInfo({ nombre: '', direccion: '', telefono: '', notas: '' });
    setView('catalog');
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col font-sans pb-28">
      {/* Top Announcement Bar */}
      <div className="bg-primary/10 border-b border-primary/20 py-2 px-4 text-xs font-semibold text-primary">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex flex-wrap items-center gap-4">
            <a 
              href="https://www.google.com/maps/search/?api=1&query=25+de+Mayo+y+Chile+San+Miguel+de+Tucuman" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-1.5 hover:underline hover:text-primary-dark transition-colors"
              title="Ver ubicación en Google Maps"
            >
              <span className="material-symbols-outlined text-sm text-primary">location_on</span>
              <span><strong>Local:</strong> 25 de Mayo y Chile, San Miguel de Tucumán</span>
            </a>
            
            <a 
              href="https://wa.me/5493814751814?text=Hola%20La%20Malila!%20Quisiera%20hacer%20una%20consulta" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-1.5 hover:underline hover:text-emerald-700 transition-colors text-emerald-800"
              title="Enviar mensaje por WhatsApp"
            >
              <span className="material-symbols-outlined text-sm text-emerald-600">chat</span>
              <span><strong>WhatsApp:</strong> 3814751814</span>
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3 text-secondary">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Atención: Lunes a Sábados (9:00 a 14:00 hs | 17:00 a 21:00 hs)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Top Header Bar */}
      <header className="bg-surface border-b border-surface-container-highest sticky top-0 z-40 px-4 md:px-8 py-3 flex justify-between items-center max-w-7xl mx-auto w-full shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('catalog')}>
          <img src="./logo.jpg" alt="La Malila Logo" className="h-10 md:h-12 w-auto object-contain rounded-full border border-primary/20 shadow-xs" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-primary tracking-tight">La Malila</h1>
            <p className="text-xs text-secondary hidden sm:block">Tu almacén de confianza</p>
          </div>
        </div>

        {/* Header Navigation (TIENDA TEXT + CARRITO PRIMARY CTA) */}
        <nav className="flex items-center gap-4">
          <button
            onClick={() => setView('catalog')}
            className={`px-2 py-1 text-sm font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              view === 'catalog' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-secondary hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-lg">storefront</span>
            <span>Tienda</span>
          </button>
          
          <button
            onClick={() => setView('cart')}
            className={`relative px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95 ${
              view === 'cart' 
                ? 'bg-emerald-800 text-white ring-2 ring-emerald-400/50' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <span className="material-symbols-outlined text-lg">shopping_cart</span>
            <span>Ver Carrito</span>
            {cart.length > 0 && (
              <span className="bg-white text-emerald-950 text-[11px] font-black px-1.5 py-0.5 rounded-full min-w-5 text-center shadow-2xs">
                {cart.length}
              </span>
            )}
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 md:px-8 pt-6">
        {view === 'catalog' ? (
          <div className="flex flex-col gap-6">
            
            {/* HERO SECTION BANNER */}
            <div className="relative overflow-hidden bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-950 text-white rounded-3xl shadow-md p-6 sm:p-8 md:p-10 flex flex-col md:flex-row justify-between items-center gap-6 border border-emerald-700/60 animate-fade-in">
              {/* Background Glow Overlay */}
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Hero Text Content */}
              <div className="flex flex-col gap-3 max-w-xl text-center md:text-left z-10">
                <div className="inline-flex items-center justify-center md:justify-start gap-2 bg-emerald-500/20 border border-emerald-400/30 px-3.5 py-1 rounded-full text-xs font-black text-emerald-200 w-fit mx-auto md:mx-0 backdrop-blur-xs shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Frescura Garantizada 🌱</span>
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
                  Del campo a tu mesa en <span className="text-emerald-300 underline decoration-amber-400 decoration-wavy decoration-2">San Miguel de Tucumán</span>
                </h2>

                <p className="text-xs sm:text-sm font-medium text-emerald-100/90 leading-relaxed">
                  Frutas y verduras seleccionadas a mano cada mañana. Envíos directos a tu domicilio o retiro por nuestro local.
                </p>

                {/* Opening Hours Info Badge */}
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 px-3.5 py-2 rounded-2xl text-xs font-extrabold text-white w-fit mx-auto md:mx-0 backdrop-blur-xs mt-1">
                  <span className="material-symbols-outlined text-amber-300 text-base">schedule</span>
                  <span>Lunes a Sábados: 9:00 a 14:00 hs | 17:00 a 21:00 hs</span>
                </div>
              </div>

              {/* Hero Image Right */}
              <div className="relative shrink-0 z-10">
                <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-52 md:h-52 rounded-3xl overflow-hidden border-2 border-white/20 shadow-xl group">
                  <img
                    src="./logo.jpg"
                    alt="Frutas y Verduras La Malila"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-[11px] px-3 py-1 rounded-xl shadow-lg border border-white/20 flex items-center gap-1">
                  <span>🔥 100% Orgánico</span>
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full max-w-2xl mx-auto md:mx-0">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary">
                search
              </span>
              <input
                type="text"
                className="w-full bg-white border border-surface-container-highest focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 pl-12 pr-4 text-on-surface outline-none transition-all shadow-sm text-xs sm:text-sm font-bold"
                placeholder="🔍 Buscar frutas, verduras o promos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Category Filter Chips (Interactive Hover States) */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {['Todas', '🔥 Ofertas', 'Frutas', 'Verduras'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2.5 rounded-full font-extrabold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? (cat === '🔥 Ofertas' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md scale-105' : 'bg-emerald-800 text-white shadow-sm scale-105')
                      : 'bg-white border border-surface-container-highest text-secondary hover:bg-emerald-50 hover:text-emerald-950 hover:border-emerald-300 shadow-2xs hover:shadow-xs active:scale-95'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Product Grid */}
            <section>
              <h2 className="text-xl font-bold text-on-surface mb-4">Productos Frescos</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {availableProducts.map((p) => {
                  const qty = getCartQuantity(p.id);
                  const isGrs = p.tipoVenta === 'grs';

                  return (
                    <article
                      key={p.id}
                      onClick={() => openAddModal(p)}
                      className="bg-white rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col border border-surface-container-low cursor-pointer active:scale-98 group"
                    >
                      {/* Product Image Header */}
                      <div className="w-full h-32 sm:h-36 overflow-hidden relative bg-surface-container-low">
                        <img 
                          src={getProductImage(p)} 
                          alt={p.nombre} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {p.esOferta ? (
                          <span className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shadow-xs flex items-center gap-0.5 animate-pulse">
                            🔥 Oferta
                          </span>
                        ) : (
                          <span className="absolute top-2 right-2 bg-white/95 backdrop-blur-xs text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shadow-2xs">
                            Fresco
                          </span>
                        )}
                      </div>

                      <div className="p-3.5 flex flex-col flex-grow">
                        <h3 className="font-bold text-base text-on-surface leading-tight line-clamp-2 mb-1">
                          {p.nombre}
                        </h3>

                        {p.esOferta && (
                          <div className="bg-amber-100/80 border border-amber-300 text-amber-950 font-bold text-[11px] px-2 py-1 rounded-lg mb-2">
                            ¡{p.cantidadOferta} {p.tipoVenta === 'grs' ? 'g' : p.tipoVenta} x ${formatPrice(p.precioOferta)}!
                          </div>
                        )}

                        <div className="mt-auto pt-4 flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="text-xl font-bold text-primary">
                              ${formatPrice(p.precioVenta)}
                            </span>
                            <span className="text-xs text-secondary">
                              / {isGrs ? '100g' : p.tipoVenta}
                            </span>
                          </div>

                          {/* Add / Quantity Badge Button */}
                          <div className="flex items-center gap-1">
                            {qty > 0 ? (
                              <div className="bg-primary text-white font-bold text-xs px-2.5 py-1.5 rounded-full shadow-xs flex items-center gap-1">
                                <span>{formatQuantity(qty)}</span>
                                <span className="material-symbols-outlined text-xs">edit</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="w-9 h-9 rounded-full bg-primary-container/20 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-xs"
                              >
                                <span className="material-symbols-outlined text-sm">add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* FRIENDLY VECTORIAL EMPTY STATE */}
              {availableProducts.length === 0 && (
                <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-surface-container-low shadow-sm flex flex-col items-center justify-center gap-4 my-4 animate-fade-in max-w-2xl mx-auto">
                  {/* SVG Vectorial Amigable de Canasta / Cajón de Verduras */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center shadow-inner">
                    <svg className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M5 10l1 10h12l1-10M9 10V6a2 2 0 012-2h2a2 2 0 012 2v4M8 14h8M9 17h6" />
                    </svg>
                  </div>

                  <div className="flex flex-col gap-1.5 max-w-md">
                    <h3 className="text-lg sm:text-xl font-black text-on-surface">
                      ¡Ups! Todavía estamos cosechando los productos de esta categoría 🌱
                    </h3>
                    <p className="text-xs sm:text-sm font-medium text-secondary">
                      Vuelve pronto o explora otras secciones de nuestra huerta. ¡Cada mañana recibimos mercadería fresca!
                    </p>
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                    <button
                      onClick={() => {
                        setSelectedCategory('🔥 Ofertas');
                        setSearchTerm('');
                      }}
                      className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>🔥 Ver ofertas disponibles</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedCategory('Todas');
                        setSearchTerm('');
                      }}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-2xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>🥬 Ver todos los productos</span>
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : (
          /* Cart View */
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setView('catalog')}
                className="text-primary flex items-center gap-1 font-semibold hover:underline"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                Seguir comprando
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Cart Item List */}
              <div className="md:col-span-7 flex flex-col gap-4">
                <h2 className="text-2xl font-bold">Tu Carrito ({cart.length})</h2>

                {cart.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl text-center text-secondary shadow-sm">
                    Tu carrito está vacío. ¡Agrega productos desde la tienda!
                  </div>
                ) : (
                  cart.map((item) => {
                    const isGrs = item.product.tipoVenta === 'grs';
                    const itemTotal = isGrs
                      ? (item.quantity / 100) * item.price
                      : item.quantity * item.price;

                    return (
                      <div
                        key={item.product.id}
                        className="bg-white rounded-xl p-4 flex flex-col gap-3 shadow-sm border border-surface-container-low"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h3 className="font-bold text-lg text-on-surface">
                              {item.product.nombre}
                            </h3>
                            <div className="text-xs text-secondary">
                              ${formatPrice(item.price)} / {isGrs ? '100g' : item.product.tipoVenta}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg text-primary">
                              ${formatPrice(itemTotal)}
                            </span>
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-error hover:bg-error-container/30 p-1.5 rounded-full transition-colors"
                              title="Eliminar ítem"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Presets and +/- */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container-highest">
                          <div className="flex gap-1 overflow-x-auto no-scrollbar items-center">
                            <span className="text-[10px] font-bold text-secondary mr-1">Sumar:</span>
                            {item.product.tipoVenta === 'kg' && [
                              { label: '+1/4', val: 0.25 },
                              { label: '+1/2', val: 0.5 },
                              { label: '+1 kg', val: 1 }
                            ].map(preset => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => addPresetToItem(item.product.id, preset.val)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-surface-container-low border border-surface-container-highest text-secondary hover:bg-primary-container/30 hover:text-primary transition-all active:scale-95 shadow-2xs"
                              >
                                {preset.label}
                              </button>
                            ))}

                            {item.product.tipoVenta === 'grs' && [
                              { label: '+100g', val: 100 },
                              { label: '+250g', val: 250 },
                              { label: '+500g', val: 500 }
                            ].map(preset => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => addPresetToItem(item.product.id, preset.val)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-surface-container-low border border-surface-container-highest text-secondary hover:bg-primary-container/30 hover:text-primary transition-all active:scale-95 shadow-2xs"
                              >
                                {preset.label}
                              </button>
                            ))}

                            {item.product.tipoVenta === 'unidad' && [
                              { label: '+1', val: 1 },
                              { label: '+2', val: 2 }
                            ].map(preset => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => addPresetToItem(item.product.id, preset.val)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-surface-container-low border border-surface-container-highest text-secondary hover:bg-primary-container/30 hover:text-primary transition-all active:scale-95 shadow-2xs"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center gap-1 bg-surface-container-low rounded-xl p-1 border border-surface-container-highest ml-auto">
                            <button
                              onClick={() => {
                                let step = item.product.tipoVenta === 'unidad' ? 1 : (item.product.tipoVenta === 'grs' ? 50 : 0.25);
                                updateCart(item.product, item.quantity - step);
                              }}
                              className="w-7 h-7 rounded-lg text-secondary flex items-center justify-center hover:bg-white"
                            >
                              <span className="material-symbols-outlined text-sm">remove</span>
                            </button>
                            <span className="font-bold text-sm px-2">
                              {formatQuantity(item.quantity)} {isGrs ? 'g' : item.product.tipoVenta}
                            </span>
                            <button
                              onClick={() => {
                                let step = item.product.tipoVenta === 'unidad' ? 1 : (item.product.tipoVenta === 'grs' ? 50 : 0.25);
                                updateCart(item.product, item.quantity + step);
                              }}
                              className="w-7 h-7 rounded-lg text-primary flex items-center justify-center hover:bg-white"
                            >
                              <span className="material-symbols-outlined text-sm">add</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Checkout Form & Order Summary */}
              <div className="md:col-span-5">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-surface-container-low sticky top-24 flex flex-col gap-4">
                  <h3 className="text-xl font-bold border-b pb-3">Resumen de Pedido</h3>

                  <div className="flex justify-between text-secondary">
                    <span>Subtotal</span>
                    <span className="font-bold text-on-surface">${formatPrice(calculateTotal())}</span>
                  </div>
                  <div className="flex justify-between text-secondary text-sm">
                    <span>Envío</span>
                    <span className="text-primary font-semibold">A convenir en WhatsApp</span>
                  </div>

                  <div className="border-t pt-3 flex justify-between items-center text-xl font-bold text-primary">
                    <span>Total</span>
                    <span>${formatPrice(calculateTotal())}</span>
                  </div>

                  {/* Customer Information Form */}
                  <form onSubmit={handleCheckout} className="flex flex-col gap-3 mt-2">
                    <div>
                      <label className="block text-xs font-bold text-secondary mb-1">Nombre y Apellido *</label>
                      <input
                        required
                        type="text"
                        className="w-full bg-surface-container-low border border-surface-container-highest rounded-lg py-2 px-3 text-sm focus:border-primary outline-none"
                        placeholder="Ej: María García"
                        value={customerInfo.nombre}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, nombre: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-secondary mb-1">Dirección de Envío *</label>
                      <input
                        required
                        type="text"
                        className="w-full bg-surface-container-low border border-surface-container-highest rounded-lg py-2 px-3 text-sm focus:border-primary outline-none"
                        placeholder="Calle, Número, Barrio..."
                        value={customerInfo.direccion}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, direccion: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-secondary mb-1">Teléfono (opcional)</label>
                      <input
                        type="tel"
                        className="w-full bg-surface-container-low border border-surface-container-highest rounded-lg py-2 px-3 text-sm focus:border-primary outline-none"
                        placeholder="Ej: 381..."
                        value={customerInfo.telefono}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, telefono: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-secondary mb-1">Notas adicionales (opcional)</label>
                      <textarea
                        className="w-full bg-surface-container-low border border-surface-container-highest rounded-lg py-2 px-3 text-sm focus:border-primary outline-none"
                        rows="2"
                        placeholder="Ej: Abonaré con $10.000, timbrar fuerte..."
                        value={customerInfo.notas}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, notas: e.target.value })}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={cart.length === 0}
                      className="w-full bg-primary hover:bg-surface-tint text-white font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                      <span className="material-symbols-outlined">chat</span>
                      <span>Confirmar Pedido vía WhatsApp</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Styled Footer */}
      <footer className="bg-surface-container-low border-t border-surface-container-highest mt-12 py-8 px-4 md:px-8 text-center sm:text-left text-xs text-secondary">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <img src="./logo.jpg" alt="Logo La Malila" className="w-8 h-8 rounded-full border border-primary/20" />
              <span className="font-bold text-base text-primary">La Malila</span>
            </div>
            <p>Tu verdulería y frutería de confianza en San Miguel de Tucumán. Frutas y verduras frescas seleccionadas todos los días.</p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-bold text-on-surface text-sm">Contacto & Dirección</span>
            <a 
              href="https://www.google.com/maps/search/?api=1&query=25+de+Mayo+y+Chile+San+Miguel+de+Tucuman" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center justify-center sm:justify-start gap-1 text-primary hover:underline font-semibold"
            >
              <span className="material-symbols-outlined text-base">location_on</span>
              <span>25 de Mayo y Chile, San Miguel de Tucumán</span>
            </a>
            <a 
              href="https://wa.me/5493814751814?text=Hola%20La%20Malila!%20Quisiera%20hacer%20un%20pedido" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center justify-center sm:justify-start gap-1 text-emerald-700 hover:underline font-semibold"
            >
              <span className="material-symbols-outlined text-base">chat</span>
              <span>WhatsApp: 3814751814</span>
            </a>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-bold text-on-surface text-sm">Horarios y Envíos</span>
            <p>🕒 <strong>Lunes a Sábado:</strong> 8:00 a 14:00 hs | 17:00 a 21:30 hs</p>
            <p>🛵 <strong>Delivery a domicilio</strong> en San Miguel de Tucumán</p>
            <p>💳 <strong>Medios de pago:</strong> Efectivo y Transferencia Bancaria</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-surface-container-highest mt-6 pt-4 text-center text-[11px] text-secondary">
          © {new Date().getFullYear()} Verdulería y Frutería "La Malila". Todos los derechos reservados.
        </div>
      </footer>

      {/* Floating Bottom Bar (Mobile Cart Button) */}
      {view === 'catalog' && cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/95 backdrop-blur-md border-t border-surface-container-highest z-40">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setView('cart')}
              className="w-full bg-primary text-white py-3.5 px-6 rounded-full font-bold shadow-lg flex justify-between items-center hover:bg-surface-tint transition-all active:scale-95"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined">shopping_cart</span>
                <span>{cart.length} productos</span>
              </div>
              <div className="flex items-center gap-1">
                <span>Ver Pedido</span>
                <span>•</span>
                <span>${formatPrice(calculateTotal())}</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* POPUP MODAL FOR CUSTOMER PRODUCT ADDITION (EXACT SCREENSHOT DESIGN) */}
      {modalProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md flex flex-col gap-5 shadow-2xl border border-surface-container-highest">
            {/* Grab handle bar */}
            <div className="w-12 h-1 bg-surface-container-highest rounded-full mx-auto mb-1"></div>

            {/* Product Summary Header */}
            <div className="flex justify-between items-start border-b border-surface-container-highest pb-4">
              <div className="flex items-center gap-3.5">
                <img 
                  src={getProductImage(modalProduct)} 
                  alt={modalProduct.nombre} 
                  className="w-16 h-16 rounded-2xl object-cover border border-surface-container-highest shrink-0 shadow-xs" 
                />
                <div>
                  <h3 className="text-xl font-bold text-on-surface leading-snug">{modalProduct.nombre}</h3>
                  <p className="text-xs text-secondary">Fresca y seleccionada.</p>
                  <p className="text-base font-bold text-primary mt-0.5">
                    ${formatPrice(modalProduct.precioVenta)} <span className="text-xs font-normal text-secondary">/ {modalProduct.tipoVenta === 'grs' ? '100g' : modalProduct.tipoVenta}</span>
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setModalProduct(null)}
                className="p-1.5 rounded-full text-secondary hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Section 1: Presets pills with +1 badge */}
            <div className="flex flex-col gap-2">
              {modalProduct.esOferta && (
                <button
                  type="button"
                  onClick={() => setModalQty(parseFloat(modalProduct.cantidadOferta) || 1)}
                  className="w-full py-3 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm shadow-md hover:brightness-105 transition-all active:scale-95 flex items-center justify-center gap-1.5 mb-1"
                >
                  <span className="material-symbols-outlined text-base">local_offer</span>
                  <span>Aprovechar Oferta: {modalProduct.cantidadOferta} {modalProduct.tipoVenta === 'grs' ? 'g' : modalProduct.tipoVenta} x ${formatPrice(modalProduct.precioOferta)}</span>
                </button>
              )}

              <label className="text-sm font-bold text-on-surface">Agregar por cantidad:</label>

              <div className="grid grid-cols-4 gap-2">
                {modalProduct.tipoVenta === 'kg' && [
                  { label: '1/4 kg', val: 0.25 },
                  { label: '1/2 kg', val: 0.5 },
                  { label: '1 kg', val: 1.0 },
                  { label: '2 kg', val: 2.0 }
                ].map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => addPresetToModal(preset.val)}
                    className="relative py-3 px-2 rounded-xl bg-surface-container-low text-on-surface font-bold text-xs border border-surface-container-highest hover:border-primary hover:bg-primary-container/20 transition-all active:scale-95 text-center flex items-center justify-center"
                  >
                    <span>{preset.label}</span>
                    <span className="absolute -top-1.5 -right-1 bg-primary text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                      +1
                    </span>
                  </button>
                ))}

                {modalProduct.tipoVenta === 'grs' && [
                  { label: '100g', val: 100 },
                  { label: '250g', val: 250 },
                  { label: '500g', val: 500 },
                  { label: '750g', val: 750 }
                ].map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => addPresetToModal(preset.val)}
                    className="relative py-3 px-2 rounded-xl bg-surface-container-low text-on-surface font-bold text-xs border border-surface-container-highest hover:border-primary hover:bg-primary-container/20 transition-all active:scale-95 text-center flex items-center justify-center"
                  >
                    <span>{preset.label}</span>
                    <span className="absolute -top-1.5 -right-1 bg-primary text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                      +1
                    </span>
                  </button>
                ))}

                {modalProduct.tipoVenta === 'unidad' && [
                  { label: '1 un', val: 1 },
                  { label: '2 un', val: 2 },
                  { label: '3 un', val: 3 },
                  { label: '5 un', val: 5 }
                ].map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => addPresetToModal(preset.val)}
                    className="relative py-3 px-2 rounded-xl bg-surface-container-low text-on-surface font-bold text-xs border border-surface-container-highest hover:border-primary hover:bg-primary-container/20 transition-all active:scale-95 text-center flex items-center justify-center"
                  >
                    <span>{preset.label}</span>
                    <span className="absolute -top-1.5 -right-1 bg-primary text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                      +1
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: Total Seleccionado Box */}
            <div className="bg-surface-container-low p-4 rounded-2xl border border-surface-container-highest flex items-center justify-between">
              <span className="font-bold text-sm text-secondary">Total seleccionado:</span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="w-9 h-9 rounded-full bg-white border border-surface-container-highest text-secondary flex items-center justify-center hover:bg-surface-container-high transition-colors shadow-2xs"
                  onClick={() => {
                    let step = modalProduct.tipoVenta === 'unidad' ? 1 : (modalProduct.tipoVenta === 'grs' ? 50 : 0.25);
                    setModalQty(prev => Math.max(0, Number(((parseFloat(prev) || 0) - step).toFixed(2))));
                  }}
                >
                  <span className="material-symbols-outlined text-base">remove</span>
                </button>

                <div className="text-xl font-bold text-primary min-w-[70px] text-center px-1">
                  {modalProduct.tipoVenta === 'grs'
                    ? (modalQty >= 1000 ? `${modalQty/1000} kg` : `${modalQty} g`)
                    : (modalProduct.tipoVenta === 'kg' && modalQty < 1 && modalQty > 0
                        ? `${modalQty * 1000} g`
                        : `${formatQuantity(modalQty)} ${modalProduct.tipoVenta}`)}
                </div>

                <button
                  type="button"
                  className="w-9 h-9 rounded-full bg-white border border-surface-container-highest text-primary flex items-center justify-center hover:bg-surface-container-high transition-colors shadow-2xs"
                  onClick={() => {
                    let step = modalProduct.tipoVenta === 'unidad' ? 1 : (modalProduct.tipoVenta === 'grs' ? 50 : 0.25);
                    setModalQty(prev => Number(((parseFloat(prev) || 0) + step).toFixed(2)));
                  }}
                >
                  <span className="material-symbols-outlined text-base">add</span>
                </button>
              </div>
            </div>

            {/* Section 3: Submit Button */}
            <button
              onClick={handleConfirmAddFromModal}
              disabled={modalQty <= 0}
              className="w-full bg-primary hover:bg-surface-tint disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2.5 text-lg transition-transform active:scale-95 mt-1"
            >
              <span className="material-symbols-outlined text-2xl">shopping_bag</span>
              <span>Agregar al Carrito (${formatPrice(getModalPrice())})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
