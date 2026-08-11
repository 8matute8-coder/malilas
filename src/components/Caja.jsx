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

  // State for Stock Warning Confirmation Modal
  const [stockWarningData, setStockWarningData] = useState(null);

  const handleConfirmQuickCalculatorSale = (totalAcumulado, breakdownList) => {
    if (recordSale) {
      const itemsFormatted = [{
        product: { nombre: 'Venta por Calculadora', tipoVenta: 'unidad', costoPromedio: 0, precioVenta: totalAcumulado },
        quantity: 1,
        precioVenta: totalAcumulado,
        isCalculator: true
      }];
      recordSale(itemsFormatted, totalAcumulado, 'Venta Rápida', 'Mostrador (Venta por Calculadora)');
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('lamalila_caja_cart', JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart]);

  const [searchTerm, setSearchTerm] = useState('');

  // Custom override for final total
  const [manualTotal, setManualTotal] = useState('');
  const [isManualOverride, setIsManualOverride] = useState(false);

  // Delivery Modal State
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({ cliente: '', direccion: '', telefono: '' });

  const formatPrice = (num) => Math.round(Number(num) || 0).toLocaleString('es-AR');
  const formatQuantity = (num) => Number(num || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 });

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

  const calculatedTotal = cart.reduce((sum, item) => sum + getItemPrice(item), 0);
  const roundedCalculatedTotal = Math.round(calculatedTotal);
  
  const finalTotal = isManualOverride && manualTotal !== '' ? parseInput(manualTotal) : roundedCalculatedTotal;

  useEffect(() => {
    if (cart.length === 0) {
      setIsManualOverride(false);
      setManualTotal('');
    }
  }, [cart]);

  // Direct Add To Cart without Intermediate Popup Modal
  const handleDirectAddToCart = (product, quantityToAdd = null) => {
    let qty = quantityToAdd;
    if (qty === null || qty <= 0) {
      if (product.tipoVenta === 'kg') qty = 1;
      else if (product.tipoVenta === 'grs') qty = 250;
      else qty = 1;
    }

    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      updateQuantity(product.id, (parseFloat(existing.quantity) || 0) + parseFloat(qty));
    } else {
      setCart([...cart, { product, quantity: parseFloat(qty) }]);
    }
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

  // Helper Function: Check if any cart item exceeds available stock in inventory
  const checkStockAndProceed = (onProceed) => {
    const insufficientItems = [];

    cart.forEach(item => {
      const liveProd = products.find(p => p.id === item.product.id);
      const availableStock = liveProd ? (liveProd.stockActual || 0) : (item.product.stockActual || 0);
      const requestedQty = parseFloat(item.quantity) || 0;

      if (requestedQty > availableStock) {
        insufficientItems.push({
          product: liveProd || item.product,
          currentStock: availableStock,
          requestedQty: requestedQty,
          shortage: requestedQty - availableStock
        });
      }
    });

    if (insufficientItems.length > 0) {
      setStockWarningData({
        items: insufficientItems,
        onConfirm: onProceed
      });
    } else {
      onProceed();
    }
  };

  const handleConfirmSale = () => {
    if (cart.length === 0) return;
    
    checkStockAndProceed(() => {
      processSale(cart);
      
      if (recordSale) {
        recordSale(cart, finalTotal, 'Local');
      }

      setCart([]);
      setIsManualOverride(false);
      setManualTotal('');
      alert('¡Venta confirmada exitosamente!');
    });
  };

  const handleCreateDelivery = (e) => {
    e.preventDefault();
    if (cart.length === 0 || !addOrder) return;

    checkStockAndProceed(() => {
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
    });
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
    <div className="flex flex-col gap-6 animate-fade-in w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Caja Registradora</h2>
          <p className="text-xs text-secondary">Ingreso rápido directo desde catálogo o con calculadora dinámicas</p>
        </div>

        {/* Action Button: Abrir Calculadora de Venta Rápida por Monto */}
        <button
          onClick={() => setShowCalculator(true)}
          className="w-full sm:w-auto bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-800 hover:to-emerald-700 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">point_of_sale</span>
          <span>⚡ Calculadora de Venta Rápida</span>
        </button>
      </div>

      {/* POS Calculator Modal */}
      <CalculadoraCajaModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        onConfirmSale={handleConfirmQuickCalculatorSale}
      />

      {/* STOCK WARNING MODAL */}
      {stockWarningData && (
        <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[150] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border-4 border-amber-400 w-full max-w-md text-left flex flex-col gap-4 animate-bounce-in my-auto">
            <div className="flex items-center gap-3 border-b border-amber-200 pb-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-2xs">
                <span className="material-symbols-outlined text-3xl">warning</span>
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] uppercase border border-amber-300">
                  ⚠️ Atención: Control de Stock
                </span>
                <h3 className="text-lg font-black text-on-surface leading-tight mt-0.5">
                  Stock Insuficiente en Venta
                </h3>
              </div>
            </div>

            <p className="text-xs font-semibold text-secondary">
              Los siguientes productos superan la cantidad disponible registrada en el inventario:
            </p>

            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 space-y-2 max-h-48 overflow-y-auto">
              {stockWarningData.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs">
                  <div>
                    <span className="font-extrabold text-on-surface block">{item.product.nombre}</span>
                    <span className="text-[11px] text-amber-900 font-bold">
                      Stock actual: {formatQuantity(item.currentStock)} {item.product.tipoVenta === 'grs' ? 'g' : item.product.tipoVenta}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-error block text-sm">
                      Vendes: {formatQuantity(item.requestedQty)} {item.product.tipoVenta === 'grs' ? 'g' : item.product.tipoVenta}
                    </span>
                    <span className="text-[10px] font-bold text-error bg-error-container/40 px-1.5 py-0.5 rounded-md">
                      Faltan: {formatQuantity(item.shortage)} {item.product.tipoVenta === 'grs' ? 'g' : item.product.tipoVenta}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs font-bold text-on-surface text-center">
              ¿Deseas continuar y registrar la venta de todas formas?
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setStockWarningData(null)}
                className="w-full py-3 rounded-xl border border-surface-container-highest text-secondary font-bold text-xs hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                ❌ Cancelar Venta
              </button>
              <button
                type="button"
                onClick={() => {
                  const callback = stockWarningData.onConfirm;
                  setStockWarningData(null);
                  callback();
                }}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1"
              >
                <span>⚠️ Vender de todas formas</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS Main Grid: Ticket Panel + Catalog Search */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        {/* TICKET / CARRITO DE VENTA PANEL (Col 4 en XL, Col 5 en LG) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-surface-container-low flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-surface-container-highest pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">receipt_long</span>
                <h3 className="font-bold text-lg text-on-surface">Ticket de Venta Actual</h3>
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
              <p className="text-secondary text-center py-6">Selecciona un producto a la derecha para añadirlo al ticket.</p>
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
                          { label: '+1kg', val: 1.0 }
                        ].map(preset => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => addPresetToItem(item.product.id, preset.val)}
                            className="px-2 py-1 rounded-lg bg-surface-container-high text-on-surface font-bold text-[10px] border border-surface-container-highest hover:bg-primary-container/30 transition-all active:scale-95"
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
                            className="px-2 py-1 rounded-lg bg-surface-container-high text-on-surface font-bold text-[10px] border border-surface-container-highest hover:bg-primary-container/30 transition-all active:scale-95"
                          >
                            {preset.label}
                          </button>
                        ))}

                        {item.product.tipoVenta === 'unidad' && [
                          { label: '+1', val: 1 },
                          { label: '+2', val: 2 },
                          { label: '+6', val: 6 }
                        ].map(preset => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => addPresetToItem(item.product.id, preset.val)}
                            className="px-2 py-1 rounded-lg bg-surface-container-high text-on-surface font-bold text-[10px] border border-surface-container-highest hover:bg-primary-container/30 transition-all active:scale-95"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* Manual Input Quantity */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-secondary font-medium">Cant:</span>
                        <input
                          type="number"
                          step="any"
                          className="w-16 bg-white border border-surface-container-highest rounded-lg p-1 text-center font-bold text-sm text-on-surface outline-none focus:border-primary"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.product.id, parseFloat(e.target.value) || 0)}
                        />
                        <span className="text-xs text-secondary font-medium">{item.product.tipoVenta === 'grs' ? 'g' : item.product.tipoVenta}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total Summary */}
            {cart.length > 0 && (
              <div className="border-t border-surface-container-highest pt-4 flex flex-col gap-3">
                <div className="bg-primary-container/20 p-3.5 rounded-xl border border-primary/20 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-secondary uppercase block">Monto Total Calculado</span>
                    <span className="text-xs text-secondary">
                      {isManualOverride ? '⚠️ Total modificado manualmente' : 'Suma de productos seleccionados'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-primary block">${formatPrice(finalTotal)}</span>
                    {!isManualOverride && (
                      <span className="text-[10px] text-primary font-bold">Redondeado por $10</span>
                    )}
                  </div>
                </div>

                {/* Optional Override Total */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="overrideTotal"
                    checked={isManualOverride}
                    onChange={(e) => {
                      setIsManualOverride(e.target.checked);
                      if (e.target.checked) {
                        setManualTotal(roundedCalculatedTotal.toString());
                      }
                    }}
                    className="w-4 h-4 text-primary rounded cursor-pointer"
                  />
                  <label htmlFor="overrideTotal" className="text-xs font-bold text-secondary cursor-pointer">
                    Modificar cobro final manualmente
                  </label>
                </div>

                {isManualOverride && (
                  <div className="flex items-center gap-2 animate-fade-in">
                    <span className="text-xs font-bold text-secondary">Nuevo Total ($):</span>
                    <input
                      type="number"
                      className="w-32 bg-surface-container-low border border-primary rounded-xl p-2 font-bold text-sm text-primary outline-none"
                      value={manualTotal}
                      onChange={(e) => setManualTotal(e.target.value)}
                      placeholder={roundedCalculatedTotal.toString()}
                    />
                  </div>
                )}

                {/* Checkout Actions */}
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    onClick={() => setShowDeliveryModal(true)}
                    className="py-3 px-4 rounded-xl border border-primary text-primary hover:bg-primary-container/20 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">local_shipping</span>
                    <span>Envío / Delivery</span>
                  </button>

                  <button
                    onClick={handleConfirmSale}
                    className="py-3 px-4 rounded-xl bg-primary hover:bg-surface-tint text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    <span>Confirmar Venta</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CATALOG PRODUCTS SEARCH & GRID (Col 8 en XL, Col 7 en LG) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary">
              search
            </span>
            <input 
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-container-highest focus:border-primary outline-none bg-white text-on-surface shadow-xs text-sm font-bold" 
              placeholder="Buscar producto en catálogo..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-surface-container-low overflow-hidden divide-y divide-surface-container-highest">
            {filteredProducts.map(p => {
              const cartItem = cart.find(i => i.product.id === p.id);

              return (
                <div 
                  key={p.id} 
                  className={`p-3.5 sm:p-4 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                    p.esOferta ? 'bg-amber-50/70 hover:bg-amber-100/70 border-l-4 border-l-amber-500' : 'hover:bg-primary-container/10'
                  }`}
                >
                  {/* Left: Image, Name, Unit, Stock & Active Ticket Badge */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <img 
                      src={getProductImage(p)} 
                      alt={p.nombre} 
                      className="w-12 h-12 rounded-xl object-cover border border-surface-container-highest shrink-0 shadow-2xs" 
                    />
                    <div className="min-w-0 flex-grow">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-extrabold text-base text-on-surface leading-snug">{p.nombre}</h4>
                        {cartItem && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-700 text-white font-black text-[10px] uppercase shadow-2xs flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">shopping_cart</span>
                            <span>En Ticket: {formatQuantity(cartItem.quantity)} {p.tipoVenta === 'grs' ? 'g' : p.tipoVenta}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="text-xs font-bold text-primary">
                          ${formatPrice(p.precioVenta)} / {p.tipoVenta === 'grs' ? '100g' : p.tipoVenta}
                        </span>
                        <span className="text-[11px] text-secondary font-medium">
                          • Stock: {formatQuantity(p.stockActual)} {p.tipoVenta}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Direct Quick-Add Action Buttons directly on the Catalog row */}
                  <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                    {/* If Product has an Offer/Promo */}
                    {p.esOferta && (
                      <button
                        type="button"
                        onClick={() => handleDirectAddToCart(p, parseFloat(p.cantidadOferta) || 1)}
                        className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-[11px] shadow-2xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                        title={`Añadir Oferta Directa: ${p.cantidadOferta} x $${formatPrice(p.precioOferta)}`}
                      >
                        <span className="material-symbols-outlined text-xs">local_offer</span>
                        <span>Promo {p.cantidadOferta} {p.tipoVenta === 'grs' ? 'g' : p.tipoVenta} x ${formatPrice(p.precioOferta)}</span>
                      </button>
                    )}

                    {/* Direct Quick Presets for KG */}
                    {p.tipoVenta === 'kg' && (
                      <div className="flex items-center gap-1">
                        {[
                          { label: '+1/4', val: 0.25 },
                          { label: '+1/2', val: 0.5 },
                          { label: '+1kg', val: 1.0 }
                        ].map(preset => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => handleDirectAddToCart(p, preset.val)}
                            className="px-2 py-1.5 rounded-xl bg-surface-container-low hover:bg-primary-container/30 text-on-surface font-extrabold text-xs border border-surface-container-highest transition-all active:scale-95 cursor-pointer shadow-2xs"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Direct Quick Presets for Grams */}
                    {p.tipoVenta === 'grs' && (
                      <div className="flex items-center gap-1">
                        {[
                          { label: '+100g', val: 100 },
                          { label: '+250g', val: 250 },
                          { label: '+500g', val: 500 }
                        ].map(preset => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => handleDirectAddToCart(p, preset.val)}
                            className="px-2 py-1.5 rounded-xl bg-surface-container-low hover:bg-primary-container/30 text-on-surface font-extrabold text-xs border border-surface-container-highest transition-all active:scale-95 cursor-pointer shadow-2xs"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Direct Quick Presets for Unidad */}
                    {p.tipoVenta === 'unidad' && (
                      <div className="flex items-center gap-1">
                        {[
                          { label: '+1', val: 1 },
                          { label: '+2', val: 2 },
                          { label: '+6', val: 6 }
                        ].map(preset => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => handleDirectAddToCart(p, preset.val)}
                            className="px-2 py-1.5 rounded-xl bg-surface-container-low hover:bg-primary-container/30 text-on-surface font-extrabold text-xs border border-surface-container-highest transition-all active:scale-95 cursor-pointer shadow-2xs"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Big Green Direct Add Button (+1 / default portion) */}
                    <button
                      type="button"
                      onClick={() => handleDirectAddToCart(p)}
                      className="bg-primary hover:bg-surface-tint text-white px-3 py-1.5 rounded-xl font-black text-xs shadow-xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                      title="Añadir al ticket inmediatamente sin modal"
                    >
                      <span className="material-symbols-outlined text-base">add_shopping_cart</span>
                      <span>Añadir</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <p className="text-secondary text-center p-6">No se encontraron productos disponibles.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
