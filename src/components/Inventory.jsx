import React, { useState, useRef } from 'react';

export default function Inventory({ inventoryData, accountingData }) {
  const { products, loading, error, saveProduct, deleteProduct, addStock, recordMerma, mermas, clearAllMermas } = inventoryData;

  const [view, setView] = useState('list'); // 'list', 'form', 'addStock', 'merma', 'mermasHistory'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPurchasesProductId, setExpandedPurchasesProductId] = useState(null);

  // Preserve Scroll Position Ref
  const scrollPosRef = useRef(0);

  // Form state for creating/editing products
  const [formData, setFormData] = useState({
    nombre: '',
    proveedor: '',
    tipoVenta: 'unidad',
    cantidadComprada: '1',
    precioTotalCompra: '',
    costoPromedio: '0',
    porcentajeGanancia: '50',
    precioVenta: '0',
    stockActual: '1',
    stockMinimo: '2',
    imagen: '',
    esOferta: false,
    cantidadOferta: '',
    precioOferta: ''
  });

  // Inline editing states for fast inline updates
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [inlinePriceInput, setInlinePriceInput] = useState('');
  const [editingStockId, setEditingStockId] = useState(null);
  const [inlineStockInput, setInlineStockInput] = useState('');

  // Quick Change Product Image Modal State
  const [modalChangeImageProduct, setModalChangeImageProduct] = useState(null);
  const [imageUrlInput, setImageUrlInput] = useState('');

  const handleOpenChangeImageModal = (product, e) => {
    if (e) e.stopPropagation();
    scrollPosRef.current = window.scrollY;
    setModalChangeImageProduct(product);
    setImageUrlInput(product.imagen || '');
  };

  // Stock form state (Add Stock / Purchase)
  const [stockForm, setStockForm] = useState({ quantity: '', totalPrice: '', cost: '', proveedor: '' });
  // Merma form state
  const [mermaForm, setMermaForm] = useState({ quantity: '', motive: '' });

  const formatPrice = (num) => Math.round(Number(num) || 0).toLocaleString('es-AR');
  const formatQuantity = (num) => (Number(num) || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 });
  const parseInput = (val) => parseFloat(val) || 0;

  // Fallback image generator using SVG icon
  const getProductImage = (p) => {
    if (p.imagen && p.imagen.trim() !== '') return p.imagen;
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4" ry="4"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
  };

  // Image File Uploader to Base64
  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen es demasiado grande. Por favor selecciona una imagen menor a 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imagen: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const calcGananciaPorcentaje = (precioVenta, costoPromedio) => {
    const pv = parseInput(precioVenta);
    const cp = parseInput(costoPromedio);
    if (cp <= 0) return 0;
    return Math.round(((pv - cp) / cp) * 100);
  };

  // Auto Calculations for New Product Form
  const handleFormQuantityOrTotalChange = (newQty, newTotal) => {
    const q = parseInput(newQty);
    const total = parseInput(newTotal);

    let unitCost = parseInput(formData.costoPromedio);
    if (q > 0 && total > 0) {
      unitCost = Math.round(total / q);
    }

    // Default 50% profit margin rounded to nearest $100
    let salePrice = parseInput(formData.precioVenta);
    if (unitCost > 0) {
      const rawMarkupPrice = unitCost * 1.5;
      salePrice = Math.round(rawMarkupPrice / 100) * 100;
    }

    const gananciaPercent = unitCost > 0 ? Math.round(((salePrice - unitCost) / unitCost) * 100) : 50;

    setFormData(prev => ({
      ...prev,
      cantidadComprada: newQty,
      precioTotalCompra: newTotal,
      costoPromedio: unitCost > 0 ? unitCost.toString() : prev.costoPromedio,
      precioVenta: salePrice > 0 ? salePrice.toString() : prev.precioVenta,
      porcentajeGanancia: gananciaPercent.toString(),
      stockActual: q > 0 ? q.toString() : prev.stockActual
    }));
  };

  const handleCostoChange = (e) => {
    const newCosto = e.target.value;
    const cp = parseInput(newCosto);
    let salePrice = parseInput(formData.precioVenta);
    if (cp > 0) {
      const rawMarkupPrice = cp * 1.5;
      salePrice = Math.round(rawMarkupPrice / 100) * 100;
    }
    const gananciaPercent = cp > 0 ? Math.round(((salePrice - cp) / cp) * 100) : 50;

    setFormData(prev => ({
      ...prev,
      costoPromedio: newCosto,
      precioVenta: salePrice > 0 ? salePrice.toString() : prev.precioVenta,
      porcentajeGanancia: gananciaPercent.toString()
    }));
  };

  const handleGananciaPorcentajeChange = (e) => {
    const pctStr = e.target.value;
    const pct = parseInput(pctStr);
    const cp = parseInput(formData.costoPromedio);

    let newPrecioVenta = formData.precioVenta;
    if (cp > 0) {
      const rawMarkupPrice = cp * (1 + pct / 100);
      newPrecioVenta = (Math.round(rawMarkupPrice / 100) * 100).toString();
    }

    setFormData(prev => ({
      ...prev,
      porcentajeGanancia: pctStr,
      precioVenta: newPrecioVenta
    }));
  };

  const handlePrecioVentaChange = (e) => {
    const pvStr = e.target.value;
    const pv = parseInput(pvStr);
    const cp = parseInput(formData.costoPromedio);
    const newGanancia = cp > 0 ? Math.round(((pv - cp) / cp) * 100) : 0;

    setFormData(prev => ({
      ...prev,
      precioVenta: pvStr,
      porcentajeGanancia: newGanancia.toString()
    }));
  };

  const handleAddNew = () => {
    scrollPosRef.current = window.scrollY;
    setSelectedProduct(null);
    setFormData({
      nombre: '',
      proveedor: '',
      tipoVenta: 'unidad',
      cantidadComprada: '1',
      precioTotalCompra: '',
      costoPromedio: '0',
      porcentajeGanancia: '50',
      precioVenta: '0',
      stockActual: '1',
      stockMinimo: '2',
      imagen: '',
      esOferta: false,
      cantidadOferta: '',
      precioOferta: ''
    });
    setView('form');
  };

  const handleEdit = (product) => {
    scrollPosRef.current = window.scrollY;
    setSelectedProduct(product);
    const cp = product.costoPromedio || 0;
    const pv = product.precioVenta || 0;
    const pct = cp > 0 ? Math.round(((pv - cp) / cp) * 100) : 50;

    setFormData({
      nombre: product.nombre || '',
      proveedor: product.proveedor || '',
      tipoVenta: product.tipoVenta || 'unidad',
      cantidadComprada: '1',
      precioTotalCompra: '',
      costoPromedio: (product.costoPromedio || 0).toString(),
      porcentajeGanancia: pct.toString(),
      precioVenta: (product.precioVenta || 0).toString(),
      stockActual: (product.stockActual || 0).toString(),
      stockMinimo: (product.stockMinimo || 2).toString(),
      imagen: product.imagen || '',
      esOferta: product.esOferta || false,
      cantidadOferta: (product.cantidadOferta || '').toString(),
      precioOferta: (product.precioOferta || '').toString()
    });
    setView('form');
  };

  const handleOpenAddStockForProduct = (product, e) => {
    if (e) e.stopPropagation();
    scrollPosRef.current = window.scrollY;
    setSelectedProduct(product);
    setStockForm({
      quantity: '',
      totalPrice: '',
      cost: (product.costoPromedio || 0).toString(),
      proveedor: ''
    });
    setView('addStock');
  };

  // Quick Price Adjust without Page Jump
  const handleQuickAdjustPrice = async (product, delta, e) => {
    if (e) e.stopPropagation();
    const currentY = window.scrollY;
    const newPrice = Math.max(0, (product.precioVenta || 0) + delta);
    await saveProduct({ ...product, precioVenta: newPrice });
    requestAnimationFrame(() => window.scrollTo(0, currentY));
  };

  const handleStartEditPrice = (product, e) => {
    if (e) e.stopPropagation();
    setEditingPriceId(product.id);
    setInlinePriceInput(product.precioVenta.toString());
  };

  const handleSaveInlinePrice = async (product) => {
    const currentY = window.scrollY;
    const newPrice = parseInput(inlinePriceInput);
    await saveProduct({ ...product, precioVenta: newPrice });
    setEditingPriceId(null);
    requestAnimationFrame(() => window.scrollTo(0, currentY));
  };

  // Quick Stock Adjust without Page Jump
  const handleQuickAdjustStock = async (product, delta, e) => {
    if (e) e.stopPropagation();
    const currentY = window.scrollY;
    const mult = product.tipoVenta === 'grs' ? 100 : 1;
    const newStock = Math.max(0, (product.stockActual || 0) + (delta * mult));
    await saveProduct({ ...product, stockActual: newStock });
    requestAnimationFrame(() => window.scrollTo(0, currentY));
  };

  const handleStartEditStock = (product, e) => {
    if (e) e.stopPropagation();
    setEditingStockId(product.id);
    setInlineStockInput(product.stockActual.toString());
  };

  const handleSaveInlineStock = async (product) => {
    const currentY = window.scrollY;
    const newStock = parseInput(inlineStockInput);
    await saveProduct({ ...product, stockActual: newStock });
    setEditingStockId(null);
    requestAnimationFrame(() => window.scrollTo(0, currentY));
  };

  const submitForm = async (e) => {
    e.preventDefault();
    const currentY = scrollPosRef.current;

    const productData = {
      nombre: formData.nombre,
      proveedor: formData.proveedor || '',
      tipoVenta: formData.tipoVenta,
      costoPromedio: parseInput(formData.costoPromedio),
      precioVenta: parseInput(formData.precioVenta),
      stockActual: parseInput(formData.stockActual),
      stockMinimo: parseInput(formData.stockMinimo),
      imagen: formData.imagen,
      esOferta: formData.esOferta,
      cantidadOferta: formData.esOferta ? parseInput(formData.cantidadOferta) : null,
      precioOferta: formData.esOferta ? parseInput(formData.precioOferta) : null
    };

    let targetId = selectedProduct?.id;
    if (selectedProduct) {
      productData.id = selectedProduct.id;
      await saveProduct(productData);
    } else {
      targetId = await saveProduct(productData);
    }

    const totalCompra = parseInput(formData.precioTotalCompra);
    const cantCompra = parseInput(formData.cantidadComprada);
    if (!selectedProduct && totalCompra > 0 && cantCompra > 0 && accountingData?.recordPurchase) {
      await accountingData.recordPurchase({
        productId: targetId,
        productNombre: formData.nombre,
        proveedor: formData.proveedor || 'Proveedor General',
        cantidad: cantCompra,
        precioTotal: totalCompra,
        costoUnitario: parseInput(formData.costoPromedio),
        categoria: 'Mercadería (Stock)'
      });
    }

    setView('list');
    requestAnimationFrame(() => window.scrollTo(0, currentY));
  };

  const submitStock = async (e) => {
    e.preventDefault();
    const currentY = scrollPosRef.current;
    const qty = parseInput(stockForm.quantity);
    let unitCost = parseInput(stockForm.cost);
    const totalPrice = parseInput(stockForm.totalPrice);

    if (qty > 0 && totalPrice > 0 && (!unitCost || unitCost === 0)) {
      unitCost = Math.round(totalPrice / qty);
    }

    const finalUnitCost = Math.round(unitCost);
    const finalTotalPrice = totalPrice > 0 ? totalPrice : Math.round(qty * finalUnitCost);

    await addStock(selectedProduct.id, qty, finalUnitCost);

    if (accountingData?.recordPurchase) {
      await accountingData.recordPurchase({
        productId: selectedProduct.id,
        productNombre: selectedProduct.nombre,
        proveedor: stockForm.proveedor || 'Proveedor General',
        cantidad: qty,
        precioTotal: finalTotalPrice,
        costoUnitario: finalUnitCost,
        categoria: 'Mercadería (Stock)'
      });
    }

    setStockForm({ quantity: '', totalPrice: '', cost: '', proveedor: '' });
    setView('list');
    requestAnimationFrame(() => window.scrollTo(0, currentY));
  };

  const submitMerma = (e) => {
    e.preventDefault();
    const currentY = scrollPosRef.current;
    recordMerma(selectedProduct.id, parseInput(mermaForm.quantity), mermaForm.motive);
    setView('list');
    requestAnimationFrame(() => window.scrollTo(0, currentY));
  };

  // -------------------------------------------------------------
  // VIEW: FORMULARIO DE NUEVO PRODUCTO / EDITAR
  // -------------------------------------------------------------
  if (view === 'form') {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-surface-container-low max-w-2xl mx-auto animate-fade-in my-4">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block mb-1">
              📦 Formulario de Inventario & Precio Promedio
            </span>
            <h2 className="text-xl font-black text-on-surface">
              {selectedProduct ? `Editar Producto: ${selectedProduct.nombre}` : 'Cargar Nuevo Producto en Inventario'}
            </h2>
          </div>
          <button onClick={() => setView('list')} className="text-secondary hover:text-on-surface font-bold text-lg p-1">
            ✕
          </button>
        </div>

        <form onSubmit={submitForm} className="flex flex-col gap-4 text-xs font-semibold">
          {/* Campo 1: Nombre del Producto */}
          <div>
            <label className="block text-xs font-extrabold text-on-surface mb-1">1. Nombre del Producto *</label>
            <input 
              required 
              className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary font-bold text-on-surface" 
              value={formData.nombre} 
              onChange={e => setFormData({ ...formData, nombre: e.target.value })} 
              placeholder="Ej: Tomate Perita / Paleta Especial" 
            />
          </div>

          {/* Campo 1.2: Proveedor */}
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">1.2 Proveedor / Distribuidora</label>
            <input 
              className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary font-bold text-on-surface" 
              value={formData.proveedor} 
              onChange={e => setFormData({ ...formData, proveedor: e.target.value })} 
              placeholder="Ej: Huerta San José / Mercado Abasto" 
            />
          </div>

          {/* Campo 2: Tipo de Venta */}
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">2. Tipo de Venta *</label>
            <select 
              className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary font-bold text-on-surface cursor-pointer" 
              value={formData.tipoVenta} 
              onChange={e => setFormData({ ...formData, tipoVenta: e.target.value })}
            >
              <option value="kg">Por Kilo (Kg)</option>
              <option value="unidad">Por Unidad</option>
              <option value="grs">Por Gramos (Grs)</option>
            </select>
          </div>

          {/* Campos 3, 4 y 5: Cantidad, Precio Compra y Costo Promedio */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-50/70 p-4 rounded-2xl border border-amber-200">
            <div>
              <label className="block text-xs font-bold text-amber-950 mb-1">3. Cantidad Comprada *</label>
              <input 
                type="number"
                step="any"
                required
                className="w-full bg-white border border-amber-300 rounded-xl p-3 text-sm outline-none focus:border-primary font-bold text-amber-950" 
                value={formData.cantidadComprada} 
                onChange={e => handleFormQuantityOrTotalChange(e.target.value, formData.precioTotalCompra)} 
                placeholder="10" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-950 mb-1">4. Precio TOTAL de Compra ($)</label>
              <input 
                type="number"
                className="w-full bg-white border border-amber-300 rounded-xl p-3 text-sm outline-none focus:border-primary font-bold text-amber-950" 
                value={formData.precioTotalCompra} 
                onChange={e => handleFormQuantityOrTotalChange(formData.cantidadComprada, e.target.value)} 
                placeholder="15000" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-950 mb-1">5. Costo Promedio (Auto) *</label>
              <input 
                type="number" 
                required 
                className="w-full bg-white border border-emerald-300 rounded-xl p-3 text-sm outline-none focus:border-primary font-black text-emerald-800" 
                value={formData.costoPromedio} 
                onChange={handleCostoChange} 
                placeholder="1500" 
              />
            </div>
          </div>

          {/* Campo 6: Precio de Venta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200">
            <div>
              <label className="block text-xs font-bold text-emerald-950 mb-1">6. Precio de Venta ($) (Redondeado a $100) *</label>
              <input 
                type="number" 
                required 
                className="w-full bg-white border border-emerald-300 rounded-xl p-3 text-base outline-none focus:border-primary font-black text-emerald-900" 
                value={formData.precioVenta} 
                onChange={handlePrecioVentaChange} 
                placeholder="2300" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-950 mb-1">Margen de Ganancia Resultante</label>
              <div className="relative">
                <input 
                  type="number" 
                  className="w-full bg-white border border-emerald-300 rounded-xl p-3 pr-8 text-sm outline-none focus:border-primary font-bold text-emerald-700" 
                  value={formData.porcentajeGanancia} 
                  onChange={handleGananciaPorcentajeChange} 
                  placeholder="50" 
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-emerald-700 text-sm">%</span>
              </div>
            </div>
          </div>

          {/* Campo 7: Stock Actual y Stock Mínimo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">7. Stock Actual Inicial *</label>
              <input 
                required 
                type="number"
                step="any"
                className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary font-bold text-on-surface" 
                value={formData.stockActual} 
                onChange={e => setFormData({ ...formData, stockActual: e.target.value })} 
                placeholder="10" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Stock Mínimo (Alerta de Reposición) *</label>
              <input 
                required 
                type="number"
                step="any"
                className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary font-bold text-on-surface" 
                value={formData.stockMinimo} 
                onChange={e => setFormData({ ...formData, stockMinimo: e.target.value })} 
                placeholder="2" 
              />
            </div>
          </div>

          {/* Opciones de Imagen y Ofertas / Promos */}
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">Imagen del Producto</label>
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
                    <span>Subir desde celular/PC</span>
                  </label>
                  {formData.imagen && (
                    <button type="button" onClick={() => setFormData({ ...formData, imagen: '' })} className="text-xs text-error font-bold hover:underline">
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-surface-container-highest pt-3">
            <div className="flex items-center gap-2 mb-2">
              <input 
                type="checkbox" 
                id="esOferta" 
                checked={formData.esOferta} 
                onChange={e => setFormData({ ...formData, esOferta: e.target.checked })} 
                className="w-4 h-4 text-primary rounded cursor-pointer"
              />
              <label htmlFor="esOferta" className="text-xs font-bold text-on-surface cursor-pointer flex items-center gap-1">
                🔥 Configurar Oferta Especial / Promoción
              </label>
            </div>

            {formData.esOferta && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/60 animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">Cantidad en Oferta ({formData.tipoVenta === 'grs' ? 'Gramos' : formData.tipoVenta})</label>
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

          <div className="flex justify-end gap-3 mt-2 pt-2 border-t">
            <button type="button" className="px-5 py-2.5 rounded-xl border border-surface-container-highest text-secondary font-semibold hover:bg-surface-container-low text-xs" onClick={() => setView('list')}>
              Cancelar
            </button>
            <button type="submit" className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-surface-tint active:scale-95 transition-all">
              Guardar Producto
            </button>
          </div>
        </form>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: INGRESAR MERCADERIA / COMPRA (ADD STOCK)
  // -------------------------------------------------------------
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

    const selectedProductPurchases = (accountingData?.purchases || []).filter(purch =>
      purch.productId === selectedProduct?.id ||
      (purch.productNombre && selectedProduct?.nombre && purch.productNombre.toLowerCase() === selectedProduct.nombre.toLowerCase())
    );

    const supplierSuggestions = Array.from(new Set(
      (accountingData?.purchases || []).map(p => p.proveedor).filter(Boolean)
    )).slice(0, 5);

    return (
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-surface-container-low max-w-xl mx-auto animate-fade-in flex flex-col gap-5 my-4">
        <div className="flex justify-between items-start border-b pb-3">
          <div>
            <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1 mb-1">
              <span className="material-symbols-outlined text-xs">shopping_bag</span>
              <span>Ingreso de Mercadería & Sincronización con Compras</span>
            </span>
            <h2 className="text-xl font-black text-on-surface">{selectedProduct?.nombre}</h2>
            <p className="text-xs text-secondary font-semibold">
              Stock Actual: {formatQuantity(oldStock)} {selectedProduct?.tipoVenta} • Costo Promedio Actual: ${formatPrice(oldCost)}
            </p>
          </div>
          <button onClick={() => setView('list')} className="p-1 text-secondary hover:text-on-surface font-bold">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Sección: Historial de Últimas Compras del Producto */}
        <div className="bg-surface-container-low p-4 rounded-2xl border border-surface-container-highest flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-bold text-on-surface">
            <span className="flex items-center gap-1.5 text-emerald-950">
              <span className="material-symbols-outlined text-emerald-700 text-base">history</span>
              <span>Historial de Últimas Compras de este Producto ({selectedProductPurchases.length})</span>
            </span>
          </div>

          {selectedProductPurchases.length === 0 ? (
            <p className="text-xs text-secondary italic">No se registran compras directas previas de proveedores para este producto.</p>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto divide-y divide-surface-container-highest pr-1">
              {selectedProductPurchases.slice(0, 4).map(purch => (
                <div key={purch.id} className="pt-1.5 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-on-surface">🏢 {purch.proveedor}</span>
                    <span className="text-[11px] text-secondary block">
                      📅 {new Date(purch.fecha).toLocaleDateString('es-AR')} • Cant: {purch.cantidad} {selectedProduct?.tipoVenta}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-800 block">${formatPrice(purch.precioTotal)}</span>
                    <span className="text-[10px] text-secondary font-bold">${formatPrice(purch.costoUnitario)} c/u</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={submitStock} className="flex flex-col gap-4">
          {/* Campo Proveedor */}
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">
              Proveedor / Distribuidora *
            </label>
            <input 
              required
              type="text"
              className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary font-bold text-on-surface" 
              value={stockForm.proveedor || ''} 
              onChange={e => setStockForm({ ...stockForm, proveedor: e.target.value })} 
              placeholder="Ej: Huerta San José / Mercado Abasto" 
            />
            {supplierSuggestions.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                <span className="text-[10px] font-bold text-secondary">Sugerencias:</span>
                {supplierSuggestions.map(sup => (
                  <button
                    key={sup}
                    type="button"
                    onClick={() => setStockForm({ ...stockForm, proveedor: sup })}
                    className="text-[10px] font-bold bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                  >
                    + {sup}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cantidad Comprada */}
          <div>
            <label className="block text-xs font-bold text-secondary mb-1">
              ¿Cuánto Compraste? ({selectedProduct?.tipoVenta === 'grs' ? 'Gramos' : selectedProduct?.tipoVenta === 'unidad' ? 'Unidades' : 'Kilos'}) *
            </label>
            <input 
              required 
              type="number"
              step="any"
              className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary font-bold text-on-surface" 
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
              placeholder="Ej: 15" 
            />
          </div>

          {/* Precio y Costo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-amber-900 mb-1">Precio TOTAL Pagado ($) *</label>
              <input 
                type="number" 
                required
                className="w-full bg-amber-50 border border-amber-300 rounded-xl p-3 text-sm outline-none focus:border-primary font-bold text-amber-950" 
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
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Costo Unitario ($/{selectedProduct?.tipoVenta}) *</label>
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
                placeholder="Ej: 1000" 
              />
            </div>
          </div>

          {/* Proyección del Reajuste de Costo Promedio */}
          {qty > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-col gap-1 text-xs text-emerald-950 animate-fade-in shadow-2xs">
              <div className="font-extrabold text-emerald-900 flex items-center gap-1">
                <span className="material-symbols-outlined text-base text-emerald-700">calculate</span>
                <span>Cálculo del Nuevo Costo Promedio Ponderado:</span>
              </div>
              <p>• Compra actual: <strong>{qty} {selectedProduct?.tipoVenta}</strong> a <strong>${formatPrice(unitC)}</strong> c/u (Total pagado: <strong>${formatPrice(totalP || qty * unitC)}</strong>)</p>
              <p>• Stock previo: {formatQuantity(oldStock)} {selectedProduct?.tipoVenta} (Costo promedio anterior: ${formatPrice(oldCost)})</p>
              <div className="text-sm font-black text-primary mt-1 bg-white p-2 rounded-xl border border-emerald-300 flex justify-between items-center">
                <span>➔ Nuevo Costo Promedio Ponderado:</span>
                <span className="text-base text-emerald-800">${formatPrice(projectedCost)} / {selectedProduct?.tipoVenta}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-2">
            <button 
              type="button" 
              className="px-5 py-2.5 rounded-xl border border-surface-container-highest text-secondary font-semibold hover:bg-surface-container-low text-xs" 
              onClick={() => setView('list')}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
            >
              Confirmar e Impactar en Compras
            </button>
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
                <span>Vaciar Historial</span>
              </button>
            )}
            <button
              onClick={() => setView('list')}
              className="px-4 py-2.5 bg-surface-container-low hover:bg-surface-container-high text-on-surface font-bold text-xs rounded-xl flex items-center gap-1 transition-colors"
            >
              <span>Volver al Inventario</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-surface-container-low overflow-hidden">
          <div className="p-4 bg-surface-container-low border-b border-surface-container-highest font-bold text-xs text-secondary uppercase tracking-wider grid grid-cols-12 gap-2">
            <div className="col-span-4">Producto & Cantidad</div>
            <div className="col-span-4">Fecha & Motivo</div>
            <div className="col-span-4 text-right">Pérdida en Costo</div>
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

                    <div className="col-span-4 text-right">
                      <span className="font-black text-error text-base block">
                        -${formatPrice(perdidaDinero)}
                      </span>
                      <span className="text-[10px] text-secondary font-bold">
                        Costo unitario: ${formatPrice(costoUnit)}
                      </span>
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

  // Calculate Metrics
  const filteredProducts = products.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

  const calcProductValuation = (p) => {
    const stock = p.stockActual || 0;
    const mult = p.tipoVenta === 'grs' ? (stock / 100) : stock;
    const costoTotal = Math.round(mult * (p.costoPromedio || 0));
    const ventaTotal = Math.round(mult * (p.precioVenta || 0));
    const gananciaTotal = ventaTotal - costoTotal;
    return { costo: costoTotal, venta: ventaTotal, ganancia: gananciaTotal };
  };

  const inventoryValuation = filteredProducts.reduce((acc, p) => {
    const val = calcProductValuation(p);
    acc.totalCosto += val.costo;
    acc.totalVenta += val.venta;
    acc.totalGanancia += val.ganancia;
    return acc;
  }, { totalCosto: 0, totalVenta: 0, totalGanancia: 0 });

  const totalPerdidaMerma = mermas.reduce((acc, m) => {
    const p = products.find(prod => prod.id === m.productId);
    const costoUnit = p ? (p.costoPromedio || 0) : 0;
    const qty = parseFloat(m.cantidad) || 0;
    const mult = (p && p.tipoVenta === 'grs') ? (qty / 100) : qty;
    return acc + Math.round(mult * costoUnit);
  }, 0);

  const sortedProducts = [...filteredProducts].sort((a, b) => a.nombre.localeCompare(b.nombre));

  // Export Inventory Control List for Manual Count (Excel / CSV)
  const handleExportInventoryControlCSV = () => {
    if (sortedProducts.length === 0) {
      alert('No hay productos en el inventario para exportar.');
      return;
    }

    const headers = ['Nombre de Producto', 'Precio', 'Stock Actual', 'Control'];

    const rows = sortedProducts.map(p => [
      `"${(p.nombre || '').replace(/"/g, '""')}"`,
      `"$${formatPrice(p.precioVenta)} / ${p.tipoVenta === 'grs' ? '100g' : p.tipoVenta}"`,
      `"${formatQuantity(p.stockActual)} ${p.tipoVenta === 'grs' ? 'g' : p.tipoVenta}"`,
      '""' // Columna vacia vaciada intencionalmente para imprimir y anotar el conteo fisico a mano
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Control_Inventario_LaMalila_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full">
      {/* Title */}
      <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">Resumen de Inventario</h2>

      {/* Financial Valuation Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-surface-container-low flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-secondary uppercase tracking-wider block mb-1">INVERSIÓN EN STOCK (COSTO)</span>
            <h3 className="text-2xl sm:text-3xl font-black text-blue-700">${formatPrice(inventoryValuation.totalCosto)}</h3>
          </div>
          <span className="text-[11px] text-secondary font-medium mt-2">Costo total acumulado de compra</span>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-xs border border-surface-container-low flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-secondary uppercase tracking-wider block mb-1">GANANCIA ESPERADA TOTAL</span>
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-700">${formatPrice(inventoryValuation.totalGanancia)}</h3>
          </div>
          <span className="text-[11px] text-emerald-800 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 w-fit mt-2">
            {inventoryValuation.totalCosto > 0 ? `+${Math.round((inventoryValuation.totalGanancia / inventoryValuation.totalCosto) * 100)}% margen global` : '0%'}
          </span>
        </div>

        <div 
          onClick={() => setView('mermasHistory')}
          className="bg-white rounded-3xl p-5 shadow-xs border border-surface-container-low flex flex-col justify-between cursor-pointer hover:bg-error-container/10 transition-colors"
          title="Haz clic para ver el historial detallado de mermas"
        >
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-error uppercase tracking-wider">PÉRDIDA POR MERMAS</span>
              <span className="material-symbols-outlined text-error text-base">receipt_long</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-error">${formatPrice(totalPerdidaMerma)}</h3>
          </div>

          <div className="mt-2 text-[11px]">
            {mermas.length > 0 ? (
              <div className="space-y-0.5 text-secondary">
                {mermas.slice(0, 2).map((m, idx) => {
                  const p = products.find(prod => prod.id === m.productId);
                  const pName = p ? p.nombre : 'Producto';
                  const unit = p ? (p.tipoVenta === 'grs' ? '100g' : p.tipoVenta) : 'unidad';
                  const costoUnit = p ? (p.costoPromedio || 0) : 0;
                  return (
                    <div key={idx} className="flex justify-between items-center text-[10px]">
                      <span className="truncate max-w-[170px]">{pName} - {m.cantidad} {unit} - ${formatPrice(m.cantidad * (p ? p.precioVenta : 0))}</span>
                      <span className="font-bold">${formatPrice(m.cantidad * costoUnit)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <span className="text-secondary font-medium">0 registros mermados (Ver detalle)</span>
            )}
          </div>
        </div>
      </div>

      {/* TOP ACTION & SEARCH TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-4 rounded-3xl border border-surface-container-low shadow-xs">
        <div className="relative flex-grow max-w-md">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary">
            search
          </span>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-container-highest focus:border-primary outline-none bg-surface-container-low text-xs font-bold text-on-surface"
            placeholder="Buscar productos por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportInventoryControlCSV}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 px-4 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-2xs"
            title="Descargar planilla de control para imprimir y anotar conteo físico a mano"
          >
            <span className="material-symbols-outlined text-emerald-700 text-lg">description</span>
            <span>📊 Exportar Planilla de Control (Excel)</span>
          </button>

          <button
            onClick={handleAddNew}
            className="bg-primary hover:bg-surface-tint text-white px-5 py-2.5 rounded-2xl font-black text-xs shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            <span>+ Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT DASHBOARD GRID: TABLE (LEFT 9 COLS) + SIDEBAR ALERTS (RIGHT 3 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">

        {/* LEFT SECTION: TABLE & PRODUCTS LIST */}
        <div className="lg:col-span-9 flex flex-col gap-3">
          {/* DESKTOP TABLE COLUMNS HEADER BAR (5 COLUMNS IN 1 LINE) */}
          <div className="hidden md:grid grid-cols-12 gap-3 bg-surface-container-low border border-surface-container-highest rounded-2xl px-5 py-3 text-xs font-black text-on-surface uppercase tracking-wider items-center shadow-2xs">
            <div className="col-span-3 text-left pl-2">Producto</div>
            <div className="col-span-2 text-center">Costo Unitario</div>
            <div className="col-span-2 text-center">Precio de Venta</div>
            <div className="col-span-2 text-center">Stock Actual</div>
            <div className="col-span-3 text-right pr-2">Acciones</div>
          </div>

          {/* PRODUCTS LIST */}
          {sortedProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center text-secondary border border-surface-container-low shadow-sm">
              <span className="material-symbols-outlined text-4xl text-secondary mb-2 block">search_off</span>
              <p className="font-bold text-sm text-on-surface">No se encontraron productos en el inventario.</p>
            </div>
          ) : (
            sortedProducts.map((p) => {
              const isLowStock = (p.stockActual || 0) <= (p.stockMinimo || 3);

              const prodPurchases = (accountingData?.purchases || []).filter(purch =>
                purch.productId === p.id ||
                (purch.productNombre && purch.productNombre.toLowerCase() === p.nombre.toLowerCase())
              );
              const lastPurchase = prodPurchases[0];

              return (
                <React.Fragment key={p.id}>
                  {/* 1. MOBILE STRUCTURED CARD VIEW (Visible only on Mobile screens < 768px) */}
                  <div className="bg-white p-4 rounded-3xl border border-surface-container-low shadow-xs flex flex-col gap-3.5 md:hidden animate-fade-in">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={(e) => handleOpenChangeImageModal(p, e)}
                          className="relative group cursor-pointer shrink-0"
                          title="Toca para cambiar la imagen o el link de este producto"
                        >
                          <img 
                            src={getProductImage(p)} 
                            alt={p.nombre} 
                            className="w-12 h-12 rounded-2xl object-cover border border-surface-container-highest shadow-2xs group-hover:scale-105 group-hover:ring-2 group-hover:ring-emerald-500 transition-all" 
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="material-symbols-outlined text-white text-xs">edit</span>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-black text-on-surface text-base leading-tight">{p.nombre}</h3>
                            {p.esOferta && (
                              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-[10px] uppercase shadow-2xs">
                                🔥 Promo {p.cantidadOferta} {p.tipoVenta === 'grs' ? 'g' : p.tipoVenta} x ${formatPrice(p.precioOferta)}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-secondary font-bold block mt-0.5">
                            Venta: Por {p.tipoVenta === 'grs' ? '100g' : p.tipoVenta}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-1.5 text-secondary hover:text-primary rounded-lg transition-colors"
                          title="Editar producto"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de eliminar "${p.nombre}"?`)) deleteProduct(p.id);
                          }}
                          className="p-1.5 text-secondary hover:text-error rounded-lg transition-colors"
                          title="Eliminar producto"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-surface-container-low p-3 rounded-2xl border border-surface-container-highest text-xs">
                      <div className="flex flex-col gap-2 border-r border-surface-container-highest/70 pr-2">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-secondary text-[11px]">Costo:</span>
                          <span className="font-black text-on-surface text-xs">${formatPrice(p.costoPromedio)}</span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className="text-secondary font-bold text-[10px]">Precio Venta:</span>
                            <span className="text-[10px] font-black text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded-md border border-emerald-200">
                              +{calcGananciaPorcentaje(p.precioVenta, p.costoPromedio)}%
                            </span>
                          </div>
                          <div className="inline-flex items-center justify-between bg-white border border-surface-container-highest rounded-xl p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={(e) => handleQuickAdjustPrice(p, -100, e)}
                              className="w-6 h-6 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface font-black text-xs flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <span 
                              onClick={(e) => handleStartEditPrice(p, e)}
                              className="font-black text-primary text-xs px-1 hover:underline cursor-pointer"
                            >
                              ${formatPrice(p.precioVenta)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleQuickAdjustPrice(p, 100, e)}
                              className="w-6 h-6 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface font-black text-xs flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between pl-1">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-secondary text-[11px]">Stock Actual:</span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="inline-flex items-center justify-between bg-white border border-surface-container-highest rounded-xl p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={(e) => handleQuickAdjustStock(p, -1, e)}
                              className="w-6 h-6 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface font-black text-xs flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <span 
                              onClick={(e) => handleStartEditStock(p, e)}
                              className="font-black text-xs px-1 hover:underline cursor-pointer text-on-surface"
                            >
                              {formatQuantity(p.stockActual)} {p.tipoVenta === 'grs' ? 'g' : p.tipoVenta}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleQuickAdjustStock(p, 1, e)}
                              className="w-6 h-6 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface font-black text-xs flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={(e) => handleOpenAddStockForProduct(p, e)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">add_shopping_cart</span>
                        <span>+ Compra</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          if (e) e.stopPropagation();
                          scrollPosRef.current = window.scrollY;
                          setSelectedProduct(p);
                          setMermaForm({ quantity: '', motive: '' });
                          setView('merma');
                        }}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">remove_shopping_cart</span>
                        <span>Merma</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. DESKTOP/TABLET TABLE ROW VIEW (5 COLUMNS IN A SINGLE HORIZONTAL LINE) */}
                  <div className="hidden md:block bg-white rounded-2xl border border-surface-container-low overflow-hidden shadow-2xs hover:bg-surface-container-low/40 transition-colors">
                    <div className={`grid grid-cols-12 gap-3 px-5 py-3.5 items-center ${
                      p.esOferta ? 'bg-amber-50/60 border-l-4 border-l-amber-500' : ''
                    }`}>
                      {/* Col 1: Producto (Col-span 3) */}
                      <div className="col-span-3 flex items-center gap-3">
                        <div 
                          onClick={(e) => handleOpenChangeImageModal(p, e)}
                          className="relative group cursor-pointer shrink-0"
                          title="Toca para cambiar la imagen o el link de este producto"
                        >
                          <img 
                            src={getProductImage(p)} 
                            alt={p.nombre} 
                            className="w-11 h-11 rounded-2xl object-cover border border-surface-container-highest shadow-2xs group-hover:scale-105 group-hover:ring-2 group-hover:ring-emerald-500 transition-all" 
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="material-symbols-outlined text-white text-xs">edit</span>
                          </div>
                        </div>
                        <div className="min-w-0 flex-grow">
                          <h3 className="font-extrabold text-on-surface text-sm leading-snug truncate">{p.nombre}</h3>
                          <span className="text-[11px] text-secondary font-medium">Por {p.tipoVenta === 'grs' ? '100g' : p.tipoVenta}</span>
                        </div>
                      </div>

                      {/* Col 2: Costo Unitario (Col-span 2) */}
                      <div className="col-span-2 text-center font-extrabold text-xs text-on-surface">
                        ${formatPrice(p.costoPromedio)}
                      </div>

                      {/* Col 3: Precio de venta (Col-span 2) */}
                      <div className="col-span-2 flex items-center justify-center gap-1.5">
                        <div className="inline-flex items-center bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-1 shadow-2xs">
                          <button
                            type="button"
                            onClick={(e) => handleQuickAdjustPrice(p, -100, e)}
                            className="w-6 h-6 rounded-xl bg-white hover:bg-emerald-100 text-emerald-900 font-extrabold text-xs flex items-center justify-center cursor-pointer shadow-2xs"
                          >
                            -
                          </button>
                          <span 
                            onClick={(e) => handleStartEditPrice(p, e)}
                            className="font-black text-emerald-900 px-2 text-xs cursor-pointer hover:underline"
                          >
                            +${formatPrice(p.precioVenta)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleQuickAdjustPrice(p, 100, e)}
                            className="w-6 h-6 rounded-xl bg-white hover:bg-emerald-100 text-emerald-900 font-extrabold text-xs flex items-center justify-center cursor-pointer shadow-2xs"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded-md border border-emerald-200 shrink-0">
                          +{calcGananciaPorcentaje(p.precioVenta, p.costoPromedio)}%
                        </span>
                      </div>

                      {/* Col 4: Stock Actual (Col-span 2) */}
                      <div className="col-span-2 flex items-center justify-center">
                        <div className="inline-flex items-center bg-surface-container-low border border-surface-container-highest rounded-2xl p-1 shadow-2xs">
                          <button
                            type="button"
                            onClick={(e) => handleQuickAdjustStock(p, -1, e)}
                            className="w-6 h-6 rounded-xl bg-white hover:bg-surface-container-high text-on-surface font-extrabold text-xs flex items-center justify-center cursor-pointer shadow-2xs"
                          >
                            -
                          </button>
                          <span 
                            onClick={(e) => handleStartEditStock(p, e)}
                            className="font-black px-2.5 text-xs cursor-pointer hover:underline text-on-surface"
                          >
                            {formatQuantity(p.stockActual)} {p.tipoVenta === 'grs' ? 'g' : p.tipoVenta === 'kg' ? 'kg' : 'unidades'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleQuickAdjustStock(p, 1, e)}
                            className="w-6 h-6 rounded-xl bg-white hover:bg-surface-container-high text-on-surface font-black text-xs flex items-center justify-center cursor-pointer shadow-2xs"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Col 5: Acciones (Col-span 3 - 4 botones con iconos diferenciables) */}
                      <div className="col-span-3 flex justify-end items-center gap-1.5 shrink-0">
                        {/* 1. Añadir Compra */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenAddStockForProduct(p, e)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl font-bold shadow-2xs transition-all flex items-center justify-center cursor-pointer active:scale-95"
                          title="Añadir Compra"
                        >
                          <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
                        </button>

                        {/* 2. Mermar Producto */}
                        <button
                          type="button"
                          onClick={(e) => {
                            if (e) e.stopPropagation();
                            scrollPosRef.current = window.scrollY;
                            setSelectedProduct(p);
                            setMermaForm({ quantity: '', motive: '' });
                            setView('merma');
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-xl font-bold shadow-2xs transition-all flex items-center justify-center cursor-pointer active:scale-95"
                          title="Mermar Producto"
                        >
                          <span className="material-symbols-outlined text-lg">remove_shopping_cart</span>
                        </button>

                        {/* 3. Editar Producto */}
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-2 text-secondary hover:text-primary hover:bg-surface-container-low rounded-xl transition-colors cursor-pointer"
                          title="Editar Producto"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>

                        {/* 4. Eliminar Producto */}
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de eliminar "${p.nombre}"?`)) deleteProduct(p.id);
                          }}
                          className="p-2 text-secondary hover:text-error hover:bg-error-container/20 rounded-xl transition-colors cursor-pointer"
                          title="Eliminar Producto"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* RIGHT SIDEBAR: LOW STOCK ALERTS & RECENTLY MODIFIED PRICES (SPANISH) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          
          {/* Card 1: Alertas de Stock Bajo */}
          <div className="bg-white rounded-3xl p-5 border border-surface-container-low shadow-xs flex flex-col gap-3">
            <h3 className="font-black text-on-surface text-sm">
              Alertas de Stock Bajo
            </h3>

            <div className="space-y-2.5 text-xs">
              {products.filter(p => (p.stockActual || 0) <= 3).length === 0 ? (
                <p className="text-secondary text-[11px] italic">No hay alertas de stock bajo actualmente.</p>
              ) : (
                products.filter(p => (p.stockActual || 0) <= 3).slice(0, 5).map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center text-on-surface py-0.5">
                    <span className="font-bold truncate max-w-[150px]">{p.nombre}</span>
                    <span className="text-[11px] text-secondary font-bold">
                      {p.stockActual === 0 ? '(Sin stock)' : `(Quedan ${p.stockActual})`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card 2: Precios Modificados Recientemente */}
          <div className="bg-white rounded-3xl p-5 border border-surface-container-low shadow-xs flex flex-col gap-3">
            <h3 className="font-black text-on-surface text-sm">
              Precios Modificados Recientemente
            </h3>

            <div className="space-y-3 text-xs">
              {sortedProducts.slice(0, 4).map((p, idx) => (
                <div key={idx} className="flex flex-col gap-0.5 border-b border-surface-container-low pb-2 last:border-0 last:pb-0">
                  <span className="font-bold text-on-surface truncate">{p.nombre}</span>
                  <span className="text-[11px] text-secondary font-medium">
                    1 {p.tipoVenta === 'grs' ? '100g' : 'unidad'} - ${formatPrice(p.precioVenta)}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* MODAL CAMBIAR IMAGEN DE PRODUCTO (POSICIONADO AL COMIENZO / ARRIBA DE LA PANTALLA) */}
      {modalChangeImageProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-6 sm:pt-14 p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-surface-container-low flex flex-col gap-4 my-auto sm:my-0">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-surface-container-low pb-3">
              <div>
                <h3 className="font-black text-on-surface text-lg flex items-center gap-2">
                  <span>🖼️ Modificar Imagen / Enlace</span>
                </h3>
                <p className="text-xs text-secondary font-semibold mt-0.5">
                  Producto: <strong className="text-on-surface">{modalChangeImageProduct.nombre}</strong>
                </p>
              </div>
              <button
                onClick={() => setModalChangeImageProduct(null)}
                className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container-high text-secondary flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Image Preview Box */}
            <div className="flex flex-col items-center justify-center bg-surface-container-low p-4 rounded-2xl border border-surface-container-highest gap-2">
              <img
                src={imageUrlInput && imageUrlInput.trim() !== '' ? imageUrlInput : getProductImage(modalChangeImageProduct)}
                alt="Vista previa"
                className="w-24 h-24 rounded-2xl object-cover border border-surface-container-highest shadow-md"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = getProductImage({});
                }}
              />
              <span className="text-[11px] text-secondary font-bold">Vista previa de la imagen</span>
            </div>

            {/* Form Fields */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-on-surface block mb-1">Enlace / Link URL de la Imagen Web:</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-container-highest focus:border-primary outline-none bg-surface-container-low text-xs font-semibold text-on-surface"
                  placeholder="https://ejemplo.com/imagen.jpg"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                />
              </div>

              {/* Upload File Button */}
              <div>
                <label className="w-full bg-surface-container-low hover:bg-surface-container-high text-on-surface border border-surface-container-highest px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95">
                  <span className="material-symbols-outlined text-primary text-base">cloud_upload</span>
                  <span>Subir imagen desde mi dispositivo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          alert('La imagen no debe superar los 2MB.');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => setImageUrlInput(reader.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>

              {/* Clear Image Button */}
              {imageUrlInput && (
                <button
                  type="button"
                  onClick={() => setImageUrlInput('')}
                  className="text-xs text-error font-bold hover:underline self-center cursor-pointer mt-1"
                >
                  Quitar imagen personalizada (Usar icono por defecto)
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-surface-container-low">
              <button
                type="button"
                onClick={() => setModalChangeImageProduct(null)}
                className="flex-1 bg-surface-container-low hover:bg-surface-container-high text-secondary font-bold text-xs py-2.5 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const currentY = window.scrollY;
                  await saveProduct({ ...modalChangeImageProduct, imagen: imageUrlInput });
                  setModalChangeImageProduct(null);
                  requestAnimationFrame(() => window.scrollTo(0, currentY));
                }}
                className="flex-1 bg-primary hover:bg-surface-tint text-white font-extrabold text-xs py-2.5 rounded-xl shadow-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-base">save</span>
                <span>Guardar Imagen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
