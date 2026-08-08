import React, { useState, useEffect } from 'react';
import { getProductImage } from '../utils/productImages';
import CalculadoraCajaModal from './CalculadoraCajaModal';

export default function Caja({ inventoryData, ordersData, salesData }) {
  const { products, processSale } = inventoryData;
  const { addOrder } = ordersData || {};
  const { recordSale } = salesData || {};
  const [showCalculator, setShowCalculator] = useState(false);
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('lamalila_caja_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const handleConfirmQuickCalculatorSale = (totalAcumulado, breakdownList) => {
    if (recordSale) {
      const itemsFormatted = breakdownList.map((item, idx) => ({
        product: { nombre: `Monto Calculadora #${idx + 1}`, tipoVenta: 'unidad', costoPromedio: 0, precioVenta: item.monto },
        quantity: 1,
        precioVenta: item.monto,
        isCalculator: true
      }));
      recordSale(itemsFormatted, totalAcumulado, 'Venta Rápida', 'Mostrador (Calculadora)');
    }
    alert(`¡Venta rápida de $${formatPrice(totalAcumulado)} registrada con éxito!`);
  };

  useEffect(() => {
    try {
      localStorage.setItem('lamalila_caja_cart', JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal for Adding Product to Ticket
  const [modalProduct, setModalProduct] = useState(null);
  const [modalQty, setModalQty] = useState(0);

  // Custom override for final total
  const [manualTotal, setManualTotal] = useState('');
  const [isManualOverride, setIsManualOverride] = useState(false);

  // Delivery Modal State
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({ cliente: '', direccion: '', telefono: '' });

  const formatPrice = (num) => Math.round(Number(num)).toLocaleString('es-AR');
  const formatQuantity = (num) => Number(num).toLocaleString('es-AR', { maximumFractionDigits: 2 });

  const parseInput = (val) => {
    const parsed = parseFloat(val.toString().replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  };

  const getItemPrice = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    if (item.product.esOferta && qty === parseFloat(item.product.cantidadOferta)) {
      return item.product.precioOferta;
    }
    if (item.product.tipoVenta === 'grs') {
      return (qty / 100) * item.product.precioVenta;
    }
    return qty * item.product.precioVenta;
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

  const calculatedTotal = cart.reduce((sum, item) => sum + getItemPrice(item), 0);
  const roundedCalculatedTotal = Math.round(calculatedTotal);
  
  const finalTotal = isManualOverride && manualTotal !== '' ? parseInput(manualTotal) : roundedCalculatedTotal;

  useEffect(() => {
    if (cart.length === 0) {
      setIsManualOverride(false);
      setManualTotal('');
    }
  }, [cart]);

  const openAddModal = (product) => {
    setModalProduct(product);
    // Initial quantity recommendation
    let initial = 1;
    if (product.tipoVenta === 'kg') initial = 1;
    if (product.tipoVenta === 'grs') initial = 250;
    setModalQty(initial);
  };

  const handleConfirmAddFromModal = () => {
    if (!modalProduct || modalQty <= 0) return;

    const existing = cart.find(item => item.product.id === modalProduct.id);
    if (existing) {
      updateQuantity(modalProduct.id, (parseFloat(existing.quantity) || 0) + parseFloat(modalQty));
    } else {
      setCart([...cart, { product: modalProduct, quantity: parseFloat(modalQty) }]);
    }

    setModalProduct(null);
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
    updateQuantity(productId, Number((current + amount).toFixed(2)));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item => 
        item.product.id === productId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const handleConfirmSale = () => {
    if (cart.length === 0) return;
    
    processSale(cart);
    
    if (recordSale) {
      recordSale(cart, finalTotal, 'Local');
    }

    setCart([]);
    setIsManualOverride(false);
    setManualTotal('');
    alert('¡Venta confirmada exitosamente!');
  };

  const handleCreateDelivery = (e) => {
    e.preventDefault();
    if (cart.length === 0 || !addOrder) return;

    addOrder({
      cliente: deliveryForm.cliente,
      direccion: deliveryForm.direccion,
      telefono: deliveryForm.telefono,
      items: cart,
      total: finalTotal
    });
    
    processSale(cart);
    
    setCart([]);
    setIsManualOverride(false);
    setManualTotal('');
    setShowDeliveryModal(false);
    setDeliveryForm({ cliente: '', direccion: '', telefono: '' });
    alert('¡Pedido de Delivery creado con éxito!');
  };

  const filteredProducts = products
    .filter(p => p.stockActual > 0)
    .filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => (b.esOferta ? 1 : 0) - (a.esOferta ? 1 : 0) || a.nombre.localeCompare(b.nombre));

  if (showDeliveryModal) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-surface-container-low max-w-md mx-auto animate-fade-in">
        <h2 className="text-xl font-bold mb-2">Convertir a Pedido de Delivery</h2>
        <p className="text-primary font-bold text-lg mb-4">Total: ${formatPrice(finalTotal)}</p>

        <form onSubmit={handleCreateDelivery} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Nombre del Cliente *</label>
            <input required className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary" value={deliveryForm.cliente} onChange={e => setDeliveryForm({...deliveryForm, cliente: e.target.value})} placeholder="Ej: Juan Pérez" />
          </div>
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Dirección de Envío *</label>
            <input required className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary" value={deliveryForm.direccion} onChange={e => setDeliveryForm({...deliveryForm, direccion: e.target.value})} placeholder="Calle y Número..." />
          </div>
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Teléfono (WhatsApp)</label>
            <input required type="tel" className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary" value={deliveryForm.telefono} onChange={e => setDeliveryForm({...deliveryForm, telefono: e.target.value})} placeholder="381..." />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" className="px-4 py-2.5 rounded-xl border text-secondary font-semibold hover:bg-surface-container-low text-sm" onClick={() => setShowDeliveryModal(false)}>Cancelar</button>
            <button type="submit" className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold shadow-md hover:bg-surface-tint text-sm">Crear Pedido</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Caja Registradora</h2>
          <p className="text-xs text-secondary">Ingreso por catálogo o venta rápida manual con calculadora dinámicas</p>
        </div>

        <button
          type="button"
          onClick={() => setShowCalculator(true)}
          className="bg-primary hover:bg-surface-tint text-white px-5 py-3 rounded-2xl font-extrabold text-sm shadow-md hover:shadow-lg flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-xl">calculate</span>
          <span>⚡ Venta Rápida por Montos (Calculadora)</span>
        </button>
      </div>

      {/* Calculadora Dinamica Modal */}
      <CalculadoraCajaModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        onConfirmSale={handleConfirmQuickCalculatorSale}
      />

      {/* Ticket / Current Cart Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-surface-container-low flex flex-col gap-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">shopping_cart</span>
            <h3 className="text-xl font-bold text-on-surface">Ticket Actual</h3>
          </div>

          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('¿Deseas limpiar todo el pedido actual?')) {
                  setCart([]);
                  setIsManualOverride(false);
                  setManualTotal('');
                }
              }}
              className="text-error hover:bg-error-container/30 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-error/20 active:scale-95"
              title="Vaciar ticket si la persona se arrepintió"
            >
              <span className="material-symbols-outlined text-base">delete_sweep</span>
              <span>Limpiar Pedido</span>
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <p className="text-secondary text-center py-6">Selecciona un producto de abajo para añadirlo al ticket.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {cart.map(item => (
              <div key={item.product.id} className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container-highest flex flex-col gap-2.5">
                {/* Top Row: Name + Remove */}
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-grow">
                    <h4 className="font-bold text-on-surface text-base truncate">{item.product.nombre}</h4>
                    <p className="text-xs text-secondary">
                      ${formatPrice(item.product.precioVenta)} / {item.product.tipoVenta === 'grs' ? '100g' : item.product.tipoVenta}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-primary text-lg">${formatPrice(getItemPrice(item))}</span>
                    <button 
                      className="text-error hover:bg-error-container/30 p-1.5 rounded-full transition-colors"
                      onClick={() => removeFromCart(item.product.id)}
                      title="Eliminar del ticket"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>

                {/* Quantity Controls & Cumulative Presets */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container-highest">
                  {/* Accumulator Presets */}
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
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-surface-container-highest text-secondary hover:bg-primary-container/30 hover:text-primary transition-all active:scale-95 shadow-2xs"
                      >
                        {preset.label}
                      </button>
                    ))}

                    {item.product.tipoVenta === 'grs' && [
                      { label: '+100g', val: 100 },
                      { label: '+250g', val: 250 },
                      { label: '+500g', val: 500 },
                      { label: '+750g', val: 750 }
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => addPresetToItem(item.product.id, preset.val)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-surface-container-highest text-secondary hover:bg-primary-container/30 hover:text-primary transition-all active:scale-95 shadow-2xs"
                      >
                        {preset.label}
                      </button>
                    ))}

                    {item.product.tipoVenta === 'unidad' && [
                      { label: '+1', val: 1 },
                      { label: '+2', val: 2 },
                      { label: '+5', val: 5 }
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => addPresetToItem(item.product.id, preset.val)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-surface-container-highest text-secondary hover:bg-primary-container/30 hover:text-primary transition-all active:scale-95 shadow-2xs"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Manual +/- Counter */}
                  <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-surface-container-highest ml-auto">
                    <button
                      className="w-7 h-7 rounded-lg text-secondary flex items-center justify-center hover:bg-surface-container-low"
                      onClick={() => {
                        let step = item.product.tipoVenta === 'unidad' ? 1 : (item.product.tipoVenta === 'grs' ? 50 : 0.25);
                        updateQuantity(item.product.id, Math.max(0, (parseFloat(item.quantity) || 0) - step));
                      }}
                    >
                      <span className="material-symbols-outlined text-sm">remove</span>
                    </button>

                    <input 
                      type="number"
                      step="any"
                      className="w-14 text-center font-bold text-sm bg-transparent outline-none" 
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product.id, e.target.value)}
                    />

                    <button
                      className="w-7 h-7 rounded-lg text-primary flex items-center justify-center hover:bg-surface-container-low"
                      onClick={() => {
                        let step = item.product.tipoVenta === 'unidad' ? 1 : (item.product.tipoVenta === 'grs' ? 50 : 0.25);
                        updateQuantity(item.product.id, (parseFloat(item.quantity) || 0) + step);
                      }}
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="border-t pt-4 flex flex-col gap-3">
              <div className="flex justify-between items-center text-sm text-secondary">
                <span>Subtotal Calculado:</span>
                <span className="font-bold text-on-surface">${formatPrice(roundedCalculatedTotal)}</span>
              </div>

              <div className="flex justify-between items-center bg-surface-container-low p-4 rounded-xl border border-surface-container-highest">
                <span className="font-bold text-lg text-on-surface">A Cobrar:</span>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold text-primary">$</span>
                  <input 
                    className="w-28 bg-white border border-surface-container-highest rounded-xl p-2 font-bold text-xl text-primary text-right outline-none focus:border-primary"
                    value={isManualOverride ? manualTotal : formatPrice(roundedCalculatedTotal)}
                    onChange={(e) => {
                      setIsManualOverride(true);
                      setManualTotal(e.target.value);
                    }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                <button 
                  className="w-full bg-surface-container-low border border-surface-container-highest text-primary font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container/20 transition-colors"
                  onClick={() => setShowDeliveryModal(true)}
                >
                  <span className="material-symbols-outlined">local_shipping</span>
                  <span>A Delivery</span>
                </button>

                <button 
                  className="sm:col-span-2 w-full bg-primary hover:bg-surface-tint text-white font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 text-lg"
                  onClick={handleConfirmSale}
                >
                  <span className="material-symbols-outlined">check_circle</span>
                  <span>Cobrar (${formatPrice(finalTotal)})</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Product Selection Table */}
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-on-surface">Catálogo para Vender (Toca para agregar)</h3>
        
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary">
            search
          </span>
          <input 
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-container-highest focus:border-primary outline-none bg-white text-on-surface shadow-xs" 
            placeholder="Buscar producto..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-surface-container-low overflow-hidden divide-y divide-surface-container-highest">
          {filteredProducts.map(p => (
            <div 
              key={p.id} 
              className={`flex justify-between items-center p-4 cursor-pointer transition-colors ${
                p.esOferta ? 'bg-amber-50/70 hover:bg-amber-100/70 border-l-4 border-l-amber-500' : 'hover:bg-primary-container/10 active:bg-primary-container/20'
              }`}
              onClick={() => openAddModal(p)}
            >
              <div className="flex items-center gap-3">
                <img 
                  src={getProductImage(p)} 
                  alt={p.nombre} 
                  className="w-12 h-12 rounded-xl object-cover border border-surface-container-highest shrink-0 shadow-2xs" 
                />
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-base text-on-surface">{p.nombre}</span>
                    {p.esOferta && (
                      <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-[10px] uppercase flex items-center gap-0.5 shadow-2xs">
                        🔥 Oferta {p.cantidadOferta} {p.tipoVenta === 'grs' ? 'g' : p.tipoVenta} x ${formatPrice(p.precioOferta)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-secondary">
                    Stock: {formatQuantity(p.stockActual)} {p.tipoVenta}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-right">
                <div>
                  <div className="font-bold text-base text-primary">
                    ${formatPrice(p.precioVenta)}
                  </div>
                  {p.esOferta ? (
                    <div className="text-xs font-bold text-amber-700">
                      🔥 Promo ${formatPrice(p.precioOferta)}
                    </div>
                  ) : (
                    <div className="text-xs text-secondary">
                      / {p.tipoVenta === 'grs' ? '100g' : p.tipoVenta}
                    </div>
                  )}
                </div>

                <span className="material-symbols-outlined text-primary bg-primary-container/30 p-2 rounded-full">
                  add_shopping_cart
                </span>
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 && (
            <p className="text-secondary text-center p-6">No se encontraron productos disponibles.</p>
          )}
        </div>
      </div>

      {/* POPUP MODAL FOR ADDING PRODUCT TO TICKET (STITCH / SCREENSHOT DESIGN) */}
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
              <span>Añadir al Ticket (${formatPrice(getModalPrice())})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
