import React, { useState } from 'react';
import { getProductImage } from '../utils/productImages';

export default function Inventory({ inventoryData, accountingData }) {
  const { products, mermas = [], saveProduct, addStock, recordMerma, deleteMerma, clearAllMermas, deleteProduct } = inventoryData;
  const [view, setView] = useState('list'); // list, form, addStock, merma, mermasHistory
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMermasHistory, setShowMermasHistory] = useState(false);
  const [expandedPurchasesProductId, setExpandedPurchasesProductId] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    nombre: '', precioVenta: '', costoPromedio: '', porcentajeGanancia: '', tipoVenta: 'kg', stockActual: '', stockMinimo: '', imagen: '',
    esOferta: false, precioOferta: '', cantidadOferta: ''
  });
  const [stockForm, setStockForm] = useState({ quantity: '', totalPrice: '', cost: '' });
  const [mermaForm, setMermaForm] = useState({ quantity: '', motive: '' });
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [inlinePriceInput, setInlinePriceInput] = useState('');
  const [editingStockId, setEditingStockId] = useState(null);
  const [inlineStockInput, setInlineStockInput] = useState('');

  const formatPrice = (num) => Math.round(Number(num)).toLocaleString('es-AR');
  const formatQuantity = (num) => Number(num).toLocaleString('es-AR', { maximumFractionDigits: 2 });

  // Ajuste de Precio
  const handleStartEditPrice = (p, e) => {
    if (e) e.stopPropagation();
    setEditingPriceId(p.id);
    setInlinePriceInput(p.precioVenta.toString());
  };

  const handleSaveInlinePrice = (p) => {
    const newPrice = Math.round(parseInput(inlinePriceInput));
    if (!isNaN(newPrice) && newPrice >= 0) {
      saveProduct({
        ...p,
        precioVenta: newPrice
      });
    }
    setEditingPriceId(null);
  };

  const handleQuickAdjustPrice = (p, delta, e) => {
    if (e) e.stopPropagation();
    const current = parseFloat(p.precioVenta) || 0;
    const updated = Math.max(0, Math.round(current + delta));
    saveProduct({
      ...p,
      precioVenta: updated
    });
  };

  // Ajuste de Stock Directo
  const handleStartEditStock = (p, e) => {
    if (e) e.stopPropagation();
    setEditingStockId(p.id);
    setInlineStockInput(p.stockActual.toString());
  };

  const handleSaveInlineStock = (p) => {
    const newStock = parseInput(inlineStockInput);
    if (!isNaN(newStock) && newStock >= 0) {
      saveProduct({
        ...p,
        stockActual: newStock
      });
    }
    setEditingStockId(null);
  };

  const getStockStep = (tipoVenta) => {
    if (tipoVenta === 'unidad') return 1;
    if (tipoVenta === 'grs') return 100;
    return 1; // 1 kg por clic
  };

  const handleQuickAdjustStock = (p, deltaMultiplier, e) => {
    if (e) e.stopPropagation();
    const step = getStockStep(p.tipoVenta);
    const current = parseFloat(p.stockActual) || 0;
    const updated = Math.max(0, Number((current + (step * deltaMultiplier)).toFixed(2)));
    saveProduct({
      ...p,
      stockActual: updated
    });
  };

  const calcGananciaPorcentaje = (precio, costo) => {
    const p = parseFloat(precio) || 0;
    const c = parseFloat(costo) || 0;
    if (c <= 0) return 0;
    return Math.round(((p - c) / c) * 100);
  };

  const calcPrecioFromGanancia = (costo, porc) => {
    const c = parseFloat(costo) || 0;
    const g = parseFloat(porc) || 0;
    return Math.round(c * (1 + (g / 100)));
  };

  const calcProductValuation = (p) => {
    const stock = parseFloat(p.stockActual) || 0;
    const precio = parseFloat(p.precioVenta) || 0;
    const costo = parseFloat(p.costoPromedio) || 0;

    if (stock <= 0) return { venta: 0, costo: 0, ganancia: 0 };
    const mult = p.tipoVenta === 'grs' ? (stock / 100) : stock;
    const venta = Math.round(mult * precio);
    const costoTot = Math.round(mult * costo);
    const ganancia = venta - costoTot;

    return { venta, costo: costoTot, ganancia };
  };

  const inventoryValuation = products.reduce((acc, p) => {
    const v = calcProductValuation(p);
    return {
      totalVenta: acc.totalVenta + v.venta,
      totalCosto: acc.totalCosto + v.costo,
      totalGanancia: acc.totalGanancia + v.ganancia
    };
  }, { totalVenta: 0, totalCosto: 0, totalGanancia: 0 });

  const totalPerdidaMerma = mermas.reduce((acc, m) => {
    const p = products.find(prod => prod.id === m.productId);
    const costoUnit = p ? (p.costoPromedio || 0) : 0;
    const qty = parseFloat(m.cantidad) || 0;
    const mult = (p && p.tipoVenta === 'grs') ? (qty / 100) : qty;
    return acc + Math.round(mult * costoUnit);
  }, 0);

  const sortedProducts = [...products]
    .filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.stockActual - a.stockActual || a.nombre.localeCompare(b.nombre));

  const handleEdit = (product) => {
    setSelectedProduct(product);
    const costo = Math.round(product.costoPromedio);
    const precio = Math.round(product.precioVenta);
    const ganancia = calcGananciaPorcentaje(precio, costo);

    setFormData({
      ...product,
      precioVenta: precio.toString(),
      costoPromedio: costo.toString(),
      porcentajeGanancia: ganancia.toString(),
      stockActual: Number(product.stockActual.toFixed(2)).toString().replace('.', ','),
      stockMinimo: Number(product.stockMinimo.toFixed(2)).toString().replace('.', ','),
      imagen: product.imagen || '',
      esOferta: Boolean(product.esOferta),
      precioOferta: product.precioOferta ? product.precioOferta.toString() : '',
      cantidadOferta: product.cantidadOferta ? product.cantidadOferta.toString() : ''
    });
    setView('form');
  };

  const handleAddNew = () => {
    setSelectedProduct(null);
    setFormData({ 
      nombre: '', precioVenta: '', costoPromedio: '', porcentajeGanancia: '50', tipoVenta: 'kg', stockActual: '', stockMinimo: '', imagen: '',
      esOferta: false, precioOferta: '', cantidadOferta: ''
    });
    setView('form');
  };

  const handleCostoChange = (e) => {
    const c = e.target.value;
    const g = formData.porcentajeGanancia;
    const nuevoPrecio = g !== '' ? calcPrecioFromGanancia(c, g) : formData.precioVenta;
    setFormData({
      ...formData,
      costoPromedio: c,
      precioVenta: nuevoPrecio.toString()
    });
  };

  const handleGananciaPorcentajeChange = (e) => {
    const g = e.target.value;
    const nuevoPrecio = calcPrecioFromGanancia(formData.costoPromedio, g);
    setFormData({
      ...formData,
      porcentajeGanancia: g,
      precioVenta: nuevoPrecio.toString()
    });
  };

  const handlePrecioVentaChange = (e) => {
    const p = e.target.value;
    const nuevaGanancia = calcGananciaPorcentaje(p, formData.costoPromedio);
    setFormData({
      ...formData,
      precioVenta: p,
      porcentajeGanancia: nuevaGanancia.toString()
    });
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = Math.min(img.width, MAX_WIDTH);
        canvas.height = img.height * (scaleSize < 1 ? scaleSize : 1);

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setFormData(prev => ({ ...prev, imagen: compressedDataUrl }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleEmptyStock = (product) => {
    if (window.confirm(`¿Estás seguro de vaciar el stock de "${product.nombre}" a 0?`)) {
      saveProduct({
        ...product,
        stockActual: 0
      });
    }
  };

  const parseInput = (val) => {
    if (!val) return 0;
    const parsed = parseFloat(val.toString().replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  };

  const submitForm = (e) => {
    e.preventDefault();
    saveProduct({
      id: selectedProduct?.id,
      nombre: formData.nombre,
      precioVenta: Math.round(parseInput(formData.precioVenta)),
      costoPromedio: Math.round(parseInput(formData.costoPromedio)),
      tipoVenta: formData.tipoVenta,
      stockActual: parseInput(formData.stockActual),
      stockMinimo: parseInput(formData.stockMinimo),
      imagen: formData.imagen || '',
      esOferta: Boolean(formData.esOferta),
      precioOferta: formData.esOferta ? Math.round(parseInput(formData.precioOferta)) : 0,
      cantidadOferta: formData.esOferta ? parseInput(formData.cantidadOferta) : 0
    });
    setView('list');
  };

  const submitStock = (e) => {
    e.preventDefault();
    const qty = parseInput(stockForm.quantity);
    let unitCost = parseInput(stockForm.cost);
    const totalPrice = parseInput(stockForm.totalPrice);

    if (qty > 0 && totalPrice > 0 && (!unitCost || unitCost === 0)) {
      unitCost = Math.round(totalPrice / qty);
    }

    addStock(selectedProduct.id, qty, Math.round(unitCost));
    setView('list');
  };

  const submitMerma = (e) => {
    e.preventDefault();
    recordMerma(selectedProduct.id, parseInput(mermaForm.quantity), mermaForm.motive);
    setView('list');
  };

  if (view === 'form') {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-surface-container-low max-w-2xl mx-auto animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-on-surface">
            {selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button onClick={() => setView('list')} className="text-secondary hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={submitForm} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Nombre del Producto</label>
            <input required className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} placeholder="Ej: Tomate Perita" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface-container-low p-4 rounded-2xl border border-surface-container-highest">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Costo Promedio ($)</label>
              <input 
                type="number" 
                required 
                className="w-full bg-white border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary font-bold text-on-surface" 
                value={formData.costoPromedio} 
                onChange={handleCostoChange} 
                placeholder="0" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-800 mb-1">% Ganancia (Markup)</label>
              <div className="relative">
                <input 
                  type="number" 
                  className="w-full bg-white border border-emerald-300 rounded-xl p-3 pr-8 text-sm outline-none focus:border-primary font-bold text-emerald-700" 
                  value={formData.porcentajeGanancia} 
                  onChange={handleGananciaPorcentajeChange} 
                  placeholder="Ej: 50" 
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-emerald-700 text-sm">%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1">Precio Venta ($)</label>
              <input 
                type="number" 
                required 
                className="w-full bg-white border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary font-bold text-primary" 
                value={formData.precioVenta} 
                onChange={handlePrecioVentaChange} 
                placeholder="0" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Tipo de Venta</label>
            <select className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary" value={formData.tipoVenta} onChange={e => setFormData({...formData, tipoVenta: e.target.value})}>
              <option value="kg">Por Kilo (Kg)</option>
              <option value="unidad">Por Unidad</option>
              <option value="grs">Por Gramos (Grs)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Stock Actual</label>
              <input required className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary" value={formData.stockActual} onChange={e => setFormData({...formData, stockActual: e.target.value})} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Stock Mínimo (Alerta)</label>
              <input required className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary" value={formData.stockMinimo} onChange={e => setFormData({...formData, stockMinimo: e.target.value})} placeholder="0" />
            </div>
          </div>

          {/* Image Uploader & Preview */}
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Imagen del Producto (Subir Foto o Link)</label>
            <div className="flex items-center gap-4 bg-surface-container-low p-3 rounded-xl border border-surface-container-highest">
              {formData.imagen ? (
                <img src={formData.imagen} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-surface-container-highest shrink-0 shadow-2xs" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-surface-container-high flex flex-col items-center justify-center text-secondary border border-dashed border-surface-container-highest shrink-0">
                  <span className="material-symbols-outlined text-2xl">add_a_photo</span>
                </div>
              )}
              <div className="flex flex-col gap-2 flex-grow">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  id="product-img-file-input" 
                  onChange={handleImageFileChange} 
                />
                <div className="flex items-center gap-2">
                  <label htmlFor="product-img-file-input" className="cursor-pointer bg-white border border-surface-container-highest px-3 py-1.5 rounded-lg text-xs font-bold text-primary hover:bg-primary-container/20 transition-colors inline-flex items-center gap-1 shadow-2xs">
                    <span className="material-symbols-outlined text-base">upload</span>
                    <span>Subir desde dispositivo</span>
                  </label>
                  {formData.imagen && (
                    <button type="button" onClick={() => setFormData({ ...formData, imagen: '' })} className="text-xs text-error font-semibold hover:underline">
                      Quitar foto
                    </button>
                  )}
                </div>
                <input 
                  type="url" 
                  className="w-full bg-white border border-surface-container-highest rounded-lg p-2 text-xs outline-none focus:border-primary" 
                  placeholder="O pega la URL de una imagen web..." 
                  value={formData.imagen}
                  onChange={e => setFormData({ ...formData, imagen: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Oferta Toggle Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input 
                type="checkbox" 
                className="w-5 h-5 accent-primary rounded cursor-pointer"
                checked={formData.esOferta || false}
                onChange={e => setFormData({ ...formData, esOferta: e.target.checked })}
              />
              <div>
                <span className="font-bold text-amber-950 text-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-amber-600 text-lg">local_offer</span>
                  Activar Precio de Oferta / Promo Especial
                </span>
                <p className="text-xs text-amber-800">Marca el producto como OFERTA en la tienda (Ej: 2 kg de mandarinas a $2.000)</p>
              </div>
            </label>

            {formData.esOferta && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/60 animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">Cantidad en Oferta ({formData.tipoVenta === 'grs' ? 'Gramos' : formData.tipoVenta === 'unidad' ? 'Unidades' : 'Kilos'})</label>
                  <input 
                    required={formData.esOferta}
                    type="number"
                    step="any"
                    className="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-sm outline-none focus:border-primary font-bold text-amber-950" 
                    value={formData.cantidadOferta} 
                    onChange={e => setFormData({ ...formData, cantidadOferta: e.target.value })} 
                    placeholder="Ej: 2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">Precio Total de la Oferta ($)</label>
                  <input 
                    required={formData.esOferta}
                    type="number"
                    className="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-sm outline-none focus:border-primary font-bold text-primary" 
                    value={formData.precioOferta} 
                    onChange={e => setFormData({ ...formData, precioOferta: e.target.value })} 
                    placeholder="Ej: 2000"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button type="button" className="px-5 py-2.5 rounded-xl border border-surface-container-highest text-secondary font-semibold hover:bg-surface-container-low text-sm" onClick={() => setView('list')}>
              Cancelar
            </button>
            <button type="submit" className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-surface-tint">
              Guardar Producto
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (view === 'addStock') {
    const qty = parseInput(stockForm.quantity);
    const totalP = parseInput(stockForm.totalPrice);
    const unitC = parseInput(stockForm.cost);

    const oldStock = selectedProduct?.stockActual || 0;
    const oldCost = selectedProduct?.costoPromedio || 0;
    const oldTotalVal = oldStock * oldCost;

    const newStock = oldStock + qty;
    const newTotalVal = qty * unitC;
    const projectedCost = newStock > 0 ? Math.round((oldTotalVal + newTotalVal) / newStock) : 0;

    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-surface-container-low max-w-lg mx-auto animate-fade-in">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-on-surface">Ingresar Mercadería / Compra</h2>
          <button onClick={() => setView('list')} className="text-secondary hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="text-primary font-bold text-base mb-4">{selectedProduct?.nombre}</p>

        <form onSubmit={submitStock} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">
              Cantidad Comprada ({selectedProduct?.tipoVenta === 'grs' ? 'Gramos' : selectedProduct?.tipoVenta === 'unidad' ? 'Unidades' : 'Kilos'}) *
            </label>
            <input 
              required 
              type="number"
              step="any"
              className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary font-bold" 
              value={stockForm.quantity} 
              onChange={e => {
                const q = e.target.value;
                const tp = parseInput(stockForm.totalPrice);
                const uc = parseInput(stockForm.cost);
                let newCost = uc;
                if (tp > 0 && parseFloat(q) > 0) {
                  newCost = Math.round(tp / parseFloat(q)).toString();
                }
                setStockForm({ ...stockForm, quantity: q, cost: newCost });
              }} 
              placeholder="Ej: 10" 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-amber-900 mb-1">Precio TOTAL Pagado por la Compra ($)</label>
              <input 
                type="number" 
                className="w-full bg-amber-50/80 border border-amber-300 rounded-xl p-3 text-sm outline-none focus:border-primary font-bold text-amber-950" 
                value={stockForm.totalPrice} 
                onChange={e => {
                  const tp = e.target.value;
                  const q = parseInput(stockForm.quantity);
                  let newCost = stockForm.cost;
                  if (q > 0 && parseFloat(tp) > 0) {
                    newCost = Math.round(parseFloat(tp) / q).toString();
                  }
                  setStockForm({ ...stockForm, totalPrice: tp, cost: newCost });
                }} 
                placeholder="Ej: 15000" 
              />
              <span className="text-[10px] text-amber-700">Calcula el costo por unidad/kg automáticamente</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Costo Unitario ($ por {selectedProduct?.tipoVenta}) *</label>
              <input 
                type="number" 
                required
                className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary font-bold text-primary" 
                value={stockForm.cost} 
                onChange={e => {
                  const uc = e.target.value;
                  const q = parseInput(stockForm.quantity);
                  let newTotal = stockForm.totalPrice;
                  if (q > 0 && parseFloat(uc) > 0) {
                    newTotal = Math.round(q * parseFloat(uc)).toString();
                  }
                  setStockForm({ ...stockForm, cost: uc, totalPrice: newTotal });
                }} 
                placeholder="Ej: 1500" 
              />
              <span className="text-[10px] text-secondary">Costo por unidad de medida</span>
            </div>
          </div>

          {/* Proyección de Cálculo */}
          {qty > 0 && (
            <div className="bg-primary-container/20 border border-primary-container p-4 rounded-xl flex flex-col gap-1 text-xs text-on-surface animate-fade-in">
              <div className="font-bold text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-base">calculate</span>
                <span>Reajuste Automático de Costo Promedio:</span>
              </div>
              <p>• Compra actual: <strong>{qty} {selectedProduct?.tipoVenta}</strong> a <strong>${formatPrice(unitC)}</strong> c/u (Total pagado: <strong>${formatPrice(totalP || qty * unitC)}</strong>)</p>
              <p>• Stock previo: {formatQuantity(oldStock)} {selectedProduct?.tipoVenta} (Costo promedio anterior: ${formatPrice(oldCost)})</p>
              <p className="text-sm font-bold text-primary mt-1">
                ➔ Nuevo Costo Promedio Ponderado: <span className="underline">${formatPrice(projectedCost)} / {selectedProduct?.tipoVenta}</span>
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <button type="button" className="px-4 py-2.5 rounded-xl border border-surface-container-highest text-secondary hover:bg-surface-container-low text-sm font-semibold" onClick={() => setView('list')}>Cancelar</button>
            <button type="submit" className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-surface-tint">Confirmar Ingreso</button>
          </div>
        </form>
      </div>
    );
  }

  if (view === 'merma') {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-surface-container-low max-w-md mx-auto animate-fade-in">
        <h2 className="text-xl font-bold text-error mb-2">Registrar Merma</h2>
        <p className="text-secondary text-sm mb-4">{selectedProduct?.nombre}</p>

        <form onSubmit={submitMerma} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Cantidad a mermar ({selectedProduct?.tipoVenta})</label>
            <input required className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary" value={mermaForm.quantity} onChange={e => setMermaForm({...mermaForm, quantity: e.target.value})} placeholder="0,00" />
          </div>
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Motivo (Opcional)</label>
            <input className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary" value={mermaForm.motive} onChange={e => setMermaForm({...mermaForm, motive: e.target.value})} placeholder="Podrido, golpeado..." />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" className="px-4 py-2 rounded-xl text-secondary hover:bg-surface-container-low text-sm" onClick={() => setView('list')}>Cancelar</button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-error text-white font-bold text-sm shadow-sm">Confirmar Merma</button>
          </div>
        </form>
      </div>
    );
  }

  if (view === 'mermasHistory') {
    return (
      <div className="flex flex-col gap-6 animate-fade-in max-w-4xl mx-auto w-full">
        {/* Header & Return / Actions Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-surface-container-low shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('list')}
              className="p-2.5 rounded-full bg-surface-container-low hover:bg-surface-container-high text-secondary transition-colors shrink-0"
              title="Volver al inventario"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
            <div>
              <h2 className="text-xl font-bold text-error flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl">receipt_long</span>
                <span>Historial de Mermas y Pérdidas</span>
              </h2>
              <p className="text-xs text-secondary">Registro de mercadería mermada y pérdida económica en costo</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mermas.length > 0 && (
              <button
                onClick={clearAllMermas}
                className="px-4 py-2.5 bg-error-container/40 hover:bg-error-container/60 text-on-error-container font-bold text-xs rounded-xl flex items-center gap-1 transition-colors"
                title="Borrar todo el historial de mermas"
              >
                <span className="material-symbols-outlined text-base">delete_sweep</span>
                <span>Vaciar Todo</span>
              </button>
            )}

            <button
              onClick={() => setView('list')}
              className="px-5 py-2.5 bg-primary hover:bg-surface-tint text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span className="material-symbols-outlined text-base">inventory_2</span>
              <span>Volver al Inventario</span>
            </button>
          </div>
        </div>

        {/* Metric Banner */}
        <div className="bg-error-container/20 border border-error-container/50 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs">
          <div>
            <span className="text-xs font-bold text-on-error-container uppercase tracking-wider block">Pérdida Económica Acumulada</span>
            <span className="text-3xl font-black text-error mt-1">${formatPrice(totalPerdidaMerma)}</span>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl text-xs text-error font-bold border border-error/20 shadow-2xs">
            📦 Total de Registros: {mermas.length}
          </div>
        </div>

        {/* Table / List of Mermas */}
        <div className="bg-white rounded-2xl shadow-sm border border-surface-container-low overflow-hidden">
          <div className="p-4 bg-surface-container-low border-b border-surface-container-highest font-bold text-xs text-secondary uppercase tracking-wider grid grid-cols-12 gap-2">
            <div className="col-span-4">Producto & Cantidad</div>
            <div className="col-span-4">Fecha & Motivo</div>
            <div className="col-span-3 text-right">Pérdida en Costo</div>
            <div className="col-span-1 text-right">Acción</div>
          </div>

          <div className="divide-y divide-surface-container-highest">
            {mermas.length === 0 ? (
              <div className="p-12 text-center text-secondary">
                <span className="material-symbols-outlined text-4xl text-secondary mb-2 block">task_alt</span>
                <p className="font-semibold text-sm">No hay mermas registradas hasta la fecha.</p>
              </div>
            ) : (
              [...mermas].reverse().map((m) => {
                const p = products.find(prod => prod.id === m.productId);
                const pName = p ? p.nombre : (m.productNombre || 'Producto eliminado');
                const costoUnit = p ? (p.costoPromedio || 0) : 0;
                const qty = parseFloat(m.cantidad) || 0;
                const mult = (p && p.tipoVenta === 'grs') ? (qty / 100) : qty;
                const perdidaDinero = Math.round(mult * costoUnit);

                return (
                  <div key={m.id} className="p-4 grid grid-cols-12 gap-2 items-center hover:bg-surface-container-low transition-colors text-sm">
                    <div className="col-span-4">
                      <h4 className="font-bold text-on-surface text-base">{pName}</h4>
                      <span className="text-xs font-semibold text-error bg-error-container/30 px-2 py-0.5 rounded-md inline-block mt-0.5">
                        Merma: {qty} {p?.tipoVenta === 'grs' ? 'g' : (p?.tipoVenta || 'kg')}
                      </span>
                    </div>

                    <div className="col-span-4 text-xs text-secondary flex flex-col gap-1">
                      <span className="font-medium text-on-surface">
                        📅 {new Date(m.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {m.motivo ? (
                        <span className="bg-surface-container-high text-on-surface px-2 py-0.5 rounded-md font-medium w-fit">
                          Motivo: {m.motivo}
                        </span>
                      ) : (
                        <span className="italic text-secondary">Sin motivo especificado</span>
                      )}
                    </div>

                    <div className="col-span-3 text-right">
                      <span className="font-black text-error text-base block">-${formatPrice(perdidaDinero)}</span>
                      <span className="text-[10px] text-secondary font-medium">Costo unit: ${formatPrice(costoUnit)}</span>
                    </div>

                    <div className="col-span-1 text-right">
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Eliminar el registro de merma de "${pName}" (${qty} ${p?.tipoVenta || 'kg'})?`)) {
                            deleteMerma(m.id);
                          }
                        }}
                        className="p-1.5 text-secondary hover:text-error hover:bg-error-container/20 rounded-full transition-colors"
                        title="Eliminar este registro de merma"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Valuación & Potencial de Venta del Inventario */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-surface-container-low border-t-4 border-t-primary flex flex-col">
          <span className="text-xs font-bold text-secondary uppercase tracking-wider">Potencial Total Venta</span>
          <span className="text-xl sm:text-2xl font-black text-primary mt-1">${formatPrice(inventoryValuation.totalVenta)}</span>
          <span className="text-[10px] text-secondary mt-0.5">Ingreso esperado en góndola</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-surface-container-low border-t-4 border-t-blue-600 flex flex-col">
          <span className="text-xs font-bold text-secondary uppercase tracking-wider">Inversión (Costo)</span>
          <span className="text-xl sm:text-2xl font-black text-blue-700 mt-1">${formatPrice(inventoryValuation.totalCosto)}</span>
          <span className="text-[11px] text-secondary mt-0.5">Costo total de compra en stock</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-surface-container-low border-t-4 border-t-emerald-600 flex flex-col">
          <span className="text-xs font-bold text-secondary uppercase tracking-wider">Ganancia Esperada</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">${formatPrice(inventoryValuation.totalGanancia)}</span>
          <span className="text-[11px] text-emerald-800 font-bold mt-0.5">
            {inventoryValuation.totalCosto > 0 ? `+${Math.round((inventoryValuation.totalGanancia / inventoryValuation.totalCosto) * 100)}% margen global` : '0%'}
          </span>
        </div>

        <div 
          onClick={() => setView('mermasHistory')}
          className="bg-white rounded-2xl p-4 shadow-sm border border-surface-container-low border-t-4 border-t-error flex flex-col cursor-pointer hover:bg-error-container/10 transition-colors"
          title="Haz clic para ver el historial detallado de mermas"
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-error uppercase tracking-wider">Pérdida por Merma</span>
            <span className="material-symbols-outlined text-error text-base">receipt_long</span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-error mt-1">${formatPrice(totalPerdidaMerma)}</span>
          <span className="text-[11px] text-error font-bold mt-0.5 underline">
            {mermas.length} registros (Ver detalle)
          </span>
        </div>
      </div>

      {/* Search and Action Bar matching Stitch Design */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="relative flex-grow max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary">
            search
          </span>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-container-highest focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white text-on-surface shadow-xs"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          onClick={handleAddNew}
          className="bg-primary text-white px-6 py-3 rounded-full font-bold shadow-md hover:bg-surface-tint transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <span className="material-symbols-outlined">add</span>
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* Stitch Design System Inventory Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-surface-container-low overflow-hidden">
        {/* Table Header (Desktop) */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-surface-container-low border-b border-surface-container-highest font-bold text-xs text-secondary uppercase tracking-wider">
          <div className="col-span-3">Producto</div>
          <div className="col-span-1 text-center">Costo</div>
          <div className="col-span-3">Precio Venta</div>
          <div className="col-span-3">Stock & Potencial</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>

        {/* Product Items */}
        <div className="divide-y divide-surface-container-highest">
          {sortedProducts.map((p) => {
            const isLowStock = p.stockActual <= p.stockMinimo;

            const prodPurchases = (accountingData?.purchases || []).filter(purch =>
              purch.productId === p.id ||
              (purch.productNombre && purch.productNombre.toLowerCase() === p.nombre.toLowerCase())
            );
            const lastPurchase = prodPurchases[0];

            return (
              <React.Fragment key={p.id}>
                <div
                  className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 md:px-6 py-3.5 transition-colors items-center ${
                    p.esOferta ? 'bg-amber-50/60 hover:bg-amber-100/60 border-l-4 border-l-amber-500' : 'hover:bg-surface-container-low'
                  }`}
                >
                  {/* Product Name & Image */}
                  <div className="col-span-1 md:col-span-3 flex items-center gap-3">
                    <img 
                      src={getProductImage(p)} 
                      alt={p.nombre} 
                      className="w-10 h-10 rounded-xl object-cover border border-surface-container-highest shrink-0 shadow-2xs" 
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-on-surface text-base leading-snug">{p.nombre}</h3>
                        {p.esOferta && (
                          <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-[10px] uppercase flex items-center gap-0.5 shadow-2xs">
                            🔥 Promo {p.cantidadOferta} {p.tipoVenta === 'grs' ? 'g' : p.tipoVenta} x ${formatPrice(p.precioOferta)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        <span className="text-xs text-secondary">Venta: Por {p.tipoVenta === 'grs' ? '100g' : p.tipoVenta}</span>
                        {lastPurchase ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setExpandedPurchasesProductId(expandedPurchasesProductId === p.id ? null : p.id); }}
                            className="text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs w-fit text-left"
                            title="Toca para desplegar el historial completo de compras aquí mismo"
                          >
                            <span className="material-symbols-outlined text-xs text-emerald-700">
                              {expandedPurchasesProductId === p.id ? 'expand_less' : 'expand_more'}
                            </span>
                            <span>Última Compra: 🏢 {lastPurchase.proveedor} (${formatPrice(lastPurchase.costoUnitario)})</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-secondary/70 italic">Sin compras registradas aún</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cost */}
                  <div className="col-span-1 md:col-span-1 flex justify-between md:justify-center md:block text-sm">
                    <span className="md:hidden font-semibold text-secondary">Costo:</span>
                    <span className="text-secondary font-medium md:text-center block">${formatPrice(p.costoPromedio)}</span>
                  </div>

                  {/* Price & % Ganancia */}
                  <div className="col-span-1 md:col-span-3 flex justify-between md:flex-col md:justify-center text-sm gap-1">
                    <span className="md:hidden font-semibold text-secondary">Precio:</span>
                    <div>
                      {editingPriceId === p.id ? (
                        <div className="flex items-center gap-1 my-0.5">
                          <span className="font-bold text-primary text-xs">$</span>
                          <input
                            type="number"
                            autoFocus
                            className="w-20 bg-emerald-50 border border-primary text-primary font-bold text-xs p-1 rounded-lg outline-none"
                            value={inlinePriceInput}
                            onChange={(e) => setInlinePriceInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlinePrice(p);
                              if (e.key === 'Escape') setEditingPriceId(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveInlinePrice(p)}
                            className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shadow-2xs hover:bg-surface-tint"
                            title="Guardar precio"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPriceId(null)}
                            className="w-6 h-6 rounded-full bg-surface-container-highest text-secondary flex items-center justify-center text-xs font-bold hover:bg-surface-container-high"
                            title="Cancelar"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 flex-wrap">
                          {/* Stepper Pill Container for Price */}
                          <div className="inline-flex items-center bg-surface-container-low border border-surface-container-highest rounded-xl p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={(e) => handleQuickAdjustPrice(p, -100, e)}
                              className="w-7 h-7 rounded-lg bg-white hover:bg-surface-container-high text-on-surface font-extrabold text-xs flex items-center justify-center transition-colors active:scale-95 cursor-pointer shadow-2xs"
                              title="Restar $100 al precio"
                            >
                              -
                            </button>
                            <span 
                              onClick={(e) => handleStartEditPrice(p, e)}
                              className="font-bold text-primary hover:underline cursor-pointer px-2.5 text-sm"
                              title="Haz clic para escribir el precio exacto"
                            >
                              ${formatPrice(p.precioVenta)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleQuickAdjustPrice(p, 100, e)}
                              className="w-7 h-7 rounded-lg bg-white hover:bg-surface-container-high text-on-surface font-extrabold text-xs flex items-center justify-center transition-colors active:scale-95 cursor-pointer shadow-2xs"
                              title="Sumar $100 al precio"
                            >
                              +
                            </button>
                          </div>

                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                            +{calcGananciaPorcentaje(p.precioVenta, p.costoPromedio)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stock & Potencial */}
                  <div className="col-span-1 md:col-span-3 flex justify-between md:flex-col md:justify-center text-sm gap-1">
                    <span className="md:hidden font-semibold text-secondary">Stock:</span>
                    <div className="flex flex-col items-end md:items-start">
                      {editingStockId === p.id ? (
                        <div className="flex items-center gap-1 my-0.5">
                          <input
                            type="number"
                            step="any"
                            autoFocus
                            className="w-20 bg-primary-container/20 border border-primary text-on-surface font-bold text-xs p-1 rounded-lg outline-none"
                            value={inlineStockInput}
                            onChange={(e) => setInlineStockInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlineStock(p);
                              if (e.key === 'Escape') setEditingStockId(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveInlineStock(p)}
                            className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shadow-2xs hover:bg-surface-tint"
                            title="Guardar nuevo stock"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingStockId(null)}
                            className="w-6 h-6 rounded-full bg-surface-container-highest text-secondary flex items-center justify-center text-xs font-bold hover:bg-surface-container-high"
                            title="Cancelar"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Stepper Pill Container for Stock */}
                          <div className="inline-flex items-center bg-surface-container-low border border-surface-container-highest rounded-xl p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={(e) => handleQuickAdjustStock(p, -1, e)}
                              className="w-7 h-7 rounded-lg bg-white hover:bg-surface-container-high text-on-surface font-extrabold text-xs flex items-center justify-center transition-colors active:scale-95 cursor-pointer shadow-2xs"
                              title={`Restar 1 ${p.tipoVenta === 'grs' ? '100g' : p.tipoVenta}`}
                            >
                              -
                            </button>
                            <span
                              onClick={(e) => handleStartEditStock(p, e)}
                              className={`font-bold hover:underline cursor-pointer px-2.5 text-sm ${isLowStock ? 'text-error' : 'text-on-surface'}`}
                              title="Haz clic para escribir el stock exacto"
                            >
                              {formatQuantity(p.stockActual)} {p.tipoVenta === 'grs' ? 'g' : p.tipoVenta}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleQuickAdjustStock(p, 1, e)}
                              className="w-7 h-7 rounded-lg bg-white hover:bg-surface-container-high text-on-surface font-extrabold text-xs flex items-center justify-center transition-colors active:scale-95 cursor-pointer shadow-2xs"
                              title={`Sumar 1 ${p.tipoVenta === 'grs' ? '100g' : p.tipoVenta}`}
                            >
                              +
                            </button>
                          </div>

                          {isLowStock && (
                            <span className="px-2 py-0.5 rounded-full bg-error-container text-error font-extrabold text-[10px] uppercase shadow-2xs">
                              ⚠️ Bajo
                            </span>
                          )}
                        </div>
                      )}

                      {/* Potencial de Venta Pill Badge */}
                      {p.stockActual > 0 && (
                        <div 
                          className="inline-flex items-center gap-1 bg-emerald-50/90 hover:bg-emerald-100/90 text-emerald-900 border border-emerald-200/80 px-2 py-0.5 rounded-lg text-[11px] font-bold mt-1 shadow-2xs transition-colors" 
                          title="Potencial de venta total esperado para el stock actual de este producto"
                        >
                          <span className="material-symbols-outlined text-[13px] text-emerald-700">payments</span>
                          <span>Potencial: <strong>${formatPrice(calcProductValuation(p).venta)}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 md:col-span-2 flex justify-end items-center gap-1 mt-2 md:mt-0">
                    <button
                      onClick={() => handleEdit(p)}
                      className="p-2 text-secondary hover:text-primary hover:bg-surface-container-low rounded-full transition-colors"
                      title="Editar producto"
                    >
                      <span className="material-symbols-outlined text-xl">edit</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedProduct(p);
                        setStockForm({ quantity: '', cost: p.costoPromedio.toString() });
                        setView('addStock');
                      }}
                      className="p-2 text-primary hover:bg-primary-container/20 rounded-full transition-colors"
                      title="Ingresar stock"
                    >
                      <span className="material-symbols-outlined text-xl">add_box</span>
                    </button>

                    <button
                      onClick={() => handleEmptyStock(p)}
                      className="p-2 text-amber-600 hover:bg-amber-100/50 rounded-full transition-colors"
                      title="Vaciar stock (Poner a 0)"
                    >
                      <span className="material-symbols-outlined text-xl">do_not_disturb_on</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedProduct(p);
                        setMermaForm({ quantity: '', motive: '' });
                        setView('merma');
                      }}
                      className="p-2 text-error hover:bg-error-container/30 rounded-full transition-colors"
                      title="Registrar merma"
                    >
                      <span className="material-symbols-outlined text-xl">remove_shopping_cart</span>
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`¿Eliminar ${p.nombre}?`)) {
                          deleteProduct(p.id);
                        }
                      }}
                      className="p-2 text-secondary hover:text-error hover:bg-error-container/20 rounded-full transition-colors"
                      title="Eliminar producto"
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                </div>

                {/* Desplegable en linea para Historial de Compras */}
                {expandedPurchasesProductId === p.id && (
                  <div className="col-span-1 md:col-span-12 px-4 md:px-6 py-3 bg-emerald-50/80 border-y border-emerald-200/80 animate-fade-in text-xs">
                    <div className="flex justify-between items-center font-extrabold text-emerald-950 mb-2">
                      <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider">
                        <span className="material-symbols-outlined text-sm text-emerald-700">history</span>
                        <span>Historial de Compras de Proveedor ({prodPurchases.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedPurchasesProductId(null)}
                        className="text-emerald-900 hover:text-emerald-950 font-bold text-[11px] bg-white px-2.5 py-1 rounded-md border border-emerald-300 shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">expand_less</span>
                        <span>Ocultar Historial</span>
                      </button>
                    </div>

                    {prodPurchases.length === 0 ? (
                      <p className="text-secondary italic py-1">No se registran compras directas de proveedores para este producto aún.</p>
                    ) : (
                      <div className="bg-white rounded-xl border border-emerald-200/80 p-3 divide-y divide-emerald-100 shadow-2xs space-y-1.5">
                        {prodPurchases.map(purch => (
                          <div key={purch.id} className="pt-1.5 flex justify-between items-center text-xs font-semibold text-emerald-950">
                            <div>
                              <span className="font-bold text-sm text-on-surface">🏢 {purch.proveedor}</span>
                              <span className="text-[11px] text-secondary block mt-0.5">
                                📅 {new Date(purch.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                {purch.categoria && <span className="ml-2 font-bold text-emerald-800">• {purch.categoria}</span>}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-emerald-950 text-sm block">${formatPrice(purch.precioTotal)}</span>
                              <span className="text-[10px] text-secondary font-bold">
                                {purch.cantidad} {p.tipoVenta === 'grs' ? 'g' : p.tipoVenta} • (${formatPrice(purch.costoUnitario)} c/u)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {sortedProducts.length === 0 && (
            <div className="p-8 text-center text-secondary">
              No se encontraron productos en el inventario.
            </div>
          )}
        </div>
      </div>

      {/* Modal Historial de Mermas */}
      {showMermasHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-surface-container-highest max-w-2xl w-full flex flex-col gap-4 max-h-[85vh] overflow-hidden">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-xl font-bold text-error flex items-center gap-2">
                  <span className="material-symbols-outlined">receipt_long</span>
                  <span>Historial de Mermas y Pérdidas</span>
                </h3>
                <p className="text-xs text-secondary">Desglose de mercadería mermada y pérdida económica</p>
              </div>
              <button 
                onClick={() => setShowMermasHistory(false)}
                className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary hover:bg-surface-container-high font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-error-container/20 border border-error-container/40 p-4 rounded-2xl flex justify-between items-center">
              <span className="font-bold text-sm text-on-error-container">Pérdida Total Acumulada:</span>
              <span className="text-2xl font-black text-error">${formatPrice(totalPerdidaMerma)}</span>
            </div>

            <div className="overflow-y-auto flex-grow divide-y divide-surface-container-highest max-h-[50vh] pr-1">
              {mermas.length === 0 ? (
                <p className="text-center text-secondary py-8 text-sm">No hay mermas registradas hasta el momento.</p>
              ) : (
                [...mermas].reverse().map((m) => {
                  const p = products.find(prod => prod.id === m.productId);
                  const pName = p ? p.nombre : (m.productNombre || 'Producto eliminado');
                  const costoUnit = p ? (p.costoPromedio || 0) : 0;
                  const qty = parseFloat(m.cantidad) || 0;
                  const mult = (p && p.tipoVenta === 'grs') ? (qty / 100) : qty;
                  const perdidaDinero = Math.round(mult * costoUnit);

                  return (
                    <div key={m.id} className="py-3 flex justify-between items-center text-sm gap-2">
                      <div>
                        <div className="font-bold text-on-surface flex items-center gap-1.5">
                          <span>{pName}</span>
                          <span className="text-xs font-semibold text-secondary">
                            ({qty} {p?.tipoVenta === 'grs' ? 'g' : (p?.tipoVenta || 'kg')})
                          </span>
                        </div>
                        <div className="text-xs text-secondary flex items-center gap-2 mt-0.5">
                          <span>📅 {new Date(m.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                          {m.motivo && <span className="bg-surface-container-high px-2 py-0.5 rounded-md">Motivo: {m.motivo}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-error block">-${formatPrice(perdidaDinero)}</span>
                        <span className="text-[10px] text-secondary">Pérdida en costo</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t pt-3 flex justify-end">
              <button
                onClick={() => setShowMermasHistory(false)}
                className="px-5 py-2.5 bg-secondary text-white font-bold rounded-xl text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historial de Compras de Proveedores del Producto */}
      {showPurchasesHistoryProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-surface-container-highest max-h-[85vh] flex flex-col gap-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-700">history</span>
                  <span>Historial de Compras de Proveedor</span>
                </h3>
                <p className="text-xs text-secondary font-semibold mt-0.5">
                  {showPurchasesHistoryProduct.nombre} (Stock actual: {showPurchasesHistoryProduct.stockActual} {showPurchasesHistoryProduct.tipoVenta})
                </p>
              </div>
              <button
                onClick={() => setShowPurchasesHistoryProduct(null)}
                className="text-secondary hover:text-on-surface font-bold text-base p-1"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-grow divide-y divide-surface-container-highest max-h-[55vh]">
              {(() => {
                const itemPurchases = (accountingData?.purchases || []).filter(purch =>
                  purch.productId === showPurchasesHistoryProduct.id ||
                  (purch.productNombre && purch.productNombre.toLowerCase() === showPurchasesHistoryProduct.nombre.toLowerCase())
                );

                if (itemPurchases.length === 0) {
                  return (
                    <div className="p-8 text-center text-secondary">
                      <p className="text-sm font-semibold">No se registran compras directas de proveedores para este producto aún.</p>
                    </div>
                  );
                }

                return itemPurchases.map(p => (
                  <div key={p.id} className="py-3 flex justify-between items-center text-sm gap-2">
                    <div>
                      <div className="font-bold text-on-surface flex items-center gap-2">
                        <span>🏢 {p.proveedor}</span>
                        <span className="text-xs font-semibold text-primary bg-primary-container/30 px-2 py-0.5 rounded-md">
                          Cant: {p.cantidad} {showPurchasesHistoryProduct.tipoVenta}
                        </span>
                      </div>
                      <div className="text-xs text-secondary mt-0.5">
                        📅 {new Date(p.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {p.categoria && <span className="ml-2 font-semibold text-emerald-800">• {p.categoria}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-on-surface text-base block">${formatPrice(p.precioTotal)}</span>
                      <span className="text-[10px] text-secondary">Costo unit: ${formatPrice(p.costoUnitario)}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="border-t pt-3 flex justify-end">
              <button
                onClick={() => setShowPurchasesHistoryProduct(null)}
                className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-xs shadow-sm hover:bg-surface-tint"
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
