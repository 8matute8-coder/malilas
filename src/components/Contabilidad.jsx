import React, { useState } from 'react';

export default function Contabilidad({ accountingData, inventoryData, salesData, contactsData }) {
  const { 
    purchases, expenses, extraMovements, 
    recordPurchase, deletePurchase, 
    recordExpense, toggleExpenseStatus, deleteExpense, 
    recordExtraMovement, deleteExtraMovement 
  } = accountingData;

  const { products } = inventoryData;
  const { sales } = salesData;

  const [subView, setSubView] = useState('dashboard'); // 'dashboard', 'compras', 'ventas', 'pagos', 'extras'

  // Modal / Form States
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    productId: '', 
    productNombre: '', 
    proveedor: '', 
    cantidad: '', 
    precioTotal: '',
    isNewProduct: false,
    tipoVenta: 'unidad',
    precioVenta: '',
    porcentajeGanancia: '50'
  });

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    concepto: '', categoria: 'Servicios', monto: '', estado: 'Pendiente'
  });

  const [showExtraModal, setShowExtraModal] = useState(false);
  const [extraForm, setExtraForm] = useState({
    tipo: 'ingreso', concepto: '', monto: ''
  });

  const formatPrice = (num) => Math.round(Number(num) || 0).toLocaleString('es-AR');

  // Helper Calculations
  const totalVentas = sales.reduce((acc, s) => acc + (s.total || 0), 0);

  const totalIngresosExtras = extraMovements
    .filter(m => m.tipo === 'ingreso')
    .reduce((acc, m) => acc + (m.monto || 0), 0);

  const totalGastosExtras = extraMovements
    .filter(m => m.tipo === 'gasto')
    .reduce((acc, m) => acc + (m.monto || 0), 0);

  const totalCompras = purchases.reduce((acc, p) => acc + (p.precioTotal || 0), 0);

  const totalGastosFijosPagados = expenses
    .filter(e => e.estado === 'Pagado')
    .reduce((acc, e) => acc + (e.monto || 0), 0);

  const totalGastosFijosPendientes = expenses
    .filter(e => e.estado === 'Pendiente')
    .reduce((acc, e) => acc + (e.monto || 0), 0);

  const ingresosTotales = totalVentas + totalIngresosExtras;
  const egresosTotales = totalCompras + totalGastosFijosPagados + totalGastosExtras;
  const balanceGeneral = ingresosTotales - egresosTotales;

  // Submit Purchase (and Auto-Sync or Create Inventory Product)
  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    const qty = parseFloat(purchaseForm.cantidad) || 0;
    const total = parseFloat(purchaseForm.precioTotal) || 0;
    if (qty <= 0 || total <= 0) {
      alert('Por favor ingresa una cantidad y precio total válidos.');
      return;
    }

    const unitCost = Math.round(total / qty);
    let targetProductId = purchaseForm.productId;
    let pNombre = purchaseForm.productNombre;

    // Si el usuario seleccionó crear un NUEVO producto:
    if (purchaseForm.isNewProduct || !targetProductId) {
      if (!pNombre) {
        alert('Por favor ingresa el nombre del nuevo producto.');
        return;
      }

      const salePrice = parseFloat(purchaseForm.precioVenta) || Math.round(unitCost * 1.5);
      const newProdData = {
        nombre: pNombre,
        tipoVenta: purchaseForm.tipoVenta || 'unidad',
        stockActual: qty, // Stock inicial con la compra
        stockMinimo: 2,
        costoPromedio: unitCost,
        precioVenta: salePrice,
        imagen: ''
      };

      if (inventoryData?.saveProduct) {
        targetProductId = await inventoryData.saveProduct(newProdData);
      }
    }

    await recordPurchase({
      productId: targetProductId,
      productNombre: pNombre || 'Producto Varios',
      proveedor: purchaseForm.proveedor || 'Proveedor General',
      cantidad: qty,
      precioTotal: total,
      costoUnitario: unitCost
    });

    setPurchaseForm({
      productId: '', productNombre: '', proveedor: '', cantidad: '', precioTotal: '',
      isNewProduct: false, tipoVenta: 'unidad', precioVenta: '', porcentajeGanancia: '50'
    });
    setShowPurchaseModal(false);
    alert(`¡Compra de "${pNombre}" registrada con éxito! El producto y su stock se han guardado en el inventario.`);
  };

  // Submit Expense
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseForm.concepto || parseFloat(expenseForm.monto) <= 0) {
      alert('Por favor ingresa un concepto y monto válido.');
      return;
    }
    await recordExpense(expenseForm);
    setExpenseForm({ concepto: '', categoria: 'Servicios', monto: '', estado: 'Pendiente' });
    setShowExpenseModal(false);
  };

  // Submit Extra Movement
  const handleExtraSubmit = async (e) => {
    e.preventDefault();
    if (!extraForm.concepto || parseFloat(extraForm.monto) <= 0) {
      alert('Por favor ingresa un concepto y monto válido.');
      return;
    }
    await recordExtraMovement(extraForm);
    setExtraForm({ tipo: 'ingreso', concepto: '', monto: '' });
    setShowExtraModal(false);
  };

  // -------------------------------------------------------------
  // 1. DASHBOARD GENERAL
  // -------------------------------------------------------------
  if (subView === 'dashboard') {
    return (
      <div className="flex flex-col gap-6 animate-fade-in max-w-6xl mx-auto w-full">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-on-surface tracking-tight">Dashboard Contable</h2>
            <p className="text-xs text-secondary">Control financiero de compras, ventas y movimientos del negocio</p>
          </div>
          <span className="bg-primary-container/40 text-on-primary-container text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Sistema Contable Activo</span>
          </span>
        </div>

        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container-low border-l-4 border-l-emerald-600 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center text-secondary mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Ingresos Totales</span>
                <span className="material-symbols-outlined text-emerald-600">trending_up</span>
              </div>
              <h3 className="text-3xl font-black text-on-surface">${formatPrice(ingresosTotales)}</h3>
            </div>
            <p className="text-[11px] text-emerald-700 font-semibold mt-3">
              Ventas (${formatPrice(totalVentas)}) + Extras (${formatPrice(totalIngresosExtras)})
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container-low border-l-4 border-l-error flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center text-secondary mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Egresos (Compras/Pagos)</span>
                <span className="material-symbols-outlined text-error">trending_down</span>
              </div>
              <h3 className="text-3xl font-black text-on-surface">${formatPrice(egresosTotales)}</h3>
            </div>
            <p className="text-[11px] text-error font-semibold mt-3">
              Compras (${formatPrice(totalCompras)}) + Gastos (${formatPrice(totalGastosFijosPagados)}) + Extras (${formatPrice(totalGastosExtras)})
            </p>
          </div>

          <div className={`rounded-3xl p-6 shadow-md flex flex-col justify-between text-white ${
            balanceGeneral >= 0 
              ? 'bg-gradient-to-br from-emerald-950 to-primary border border-white/10' 
              : 'bg-gradient-to-br from-red-950 to-error border border-white/10'
          }`}>
            <div>
              <div className="flex justify-between items-center text-white/80 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Balance General</span>
                <span className="material-symbols-outlined">{balanceGeneral >= 0 ? 'account_balance_wallet' : 'warning'}</span>
              </div>
              <h3 className="text-3xl font-black tracking-tight">${formatPrice(balanceGeneral)}</h3>
            </div>
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold w-fit mt-3 backdrop-blur-xs">
              {balanceGeneral >= 0 ? '✓ Flujo neto positivo' : '⚠ Flujo neto negativo'}
            </span>
          </div>
        </div>

        {/* Navigation Grid (4 Sub-Sections matching mockup) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
          <button
            onClick={() => setSubView('compras')}
            className="bg-white hover:bg-surface-container-low p-5 rounded-2xl border border-surface-container-highest flex flex-col items-center text-center gap-2 transition-all hover:border-primary active:scale-95 shadow-xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">local_shipping</span>
            </div>
            <div>
              <h4 className="font-bold text-on-surface text-base">Compras</h4>
              <p className="text-[11px] text-secondary">Proveedores & Stock</p>
            </div>
          </button>

          <button
            onClick={() => setSubView('ventas')}
            className="bg-white hover:bg-surface-container-low p-5 rounded-2xl border border-surface-container-highest flex flex-col items-center text-center gap-2 transition-all hover:border-primary active:scale-95 shadow-xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">receipt</span>
            </div>
            <div>
              <h4 className="font-bold text-on-surface text-base">Ventas</h4>
              <p className="text-[11px] text-secondary">Historial de Ventas</p>
            </div>
          </button>

          <button
            onClick={() => setSubView('pagos')}
            className="bg-white hover:bg-surface-container-low p-5 rounded-2xl border border-surface-container-highest flex flex-col items-center text-center gap-2 transition-all hover:border-primary active:scale-95 shadow-xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">payments</span>
            </div>
            <div>
              <h4 className="font-bold text-on-surface text-base">Pagos</h4>
              <p className="text-[11px] text-secondary">Gastos Fijos & Servicios</p>
            </div>
          </button>

          <button
            onClick={() => setSubView('extras')}
            className="bg-white hover:bg-surface-container-low p-5 rounded-2xl border border-surface-container-highest flex flex-col items-center text-center gap-2 transition-all hover:border-primary active:scale-95 shadow-xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">more_horiz</span>
            </div>
            <div>
              <h4 className="font-bold text-on-surface text-base">Extras</h4>
              <p className="text-[11px] text-secondary">Otros Movimientos</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. SECCIÓN DE COMPRAS (PROVEEDORES Y SYNC A INVENTARIO)
  // -------------------------------------------------------------
  if (subView === 'compras') {
    return (
      <div className="flex flex-col gap-6 animate-fade-in max-w-4xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-surface-container-low shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSubView('dashboard')}
              className="p-2.5 rounded-full bg-surface-container-low hover:bg-surface-container-high text-secondary transition-colors"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
            <div>
              <h2 className="text-xl font-bold text-on-surface">Control de Compras (Proveedores)</h2>
              <p className="text-xs text-secondary">Gestión de compras con sincronización automática de stock</p>
            </div>
          </div>

          <button
            onClick={() => setShowPurchaseModal(true)}
            className="bg-primary text-white font-bold px-5 py-2.5 rounded-full text-xs shadow-md hover:bg-surface-tint flex items-center gap-2 transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Registrar Compra</span>
          </button>
        </div>

        {/* Metric Summary */}
        <div className="bg-white p-6 rounded-2xl border border-surface-container-low shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-xs font-bold text-secondary uppercase tracking-wider block">Total Compras de Mercadería</span>
            <span className="text-3xl font-black text-primary mt-1">${formatPrice(totalCompras)}</span>
          </div>
          <div className="bg-primary-container/30 px-4 py-2 rounded-xl text-xs font-bold text-primary border border-primary/20">
            📦 Compras registradas: {purchases.length}
          </div>
        </div>

        {/* Purchases List */}
        <div className="bg-white rounded-2xl shadow-sm border border-surface-container-low overflow-hidden">
          <div className="p-4 bg-surface-container-low border-b font-bold text-xs text-secondary uppercase tracking-wider grid grid-cols-12 gap-2">
            <div className="col-span-4">Producto & Cantidad</div>
            <div className="col-span-4">Proveedor & Fecha</div>
            <div className="col-span-3 text-right">Total Pagado</div>
            <div className="col-span-1 text-right">Acción</div>
          </div>

          <div className="divide-y divide-surface-container-highest">
            {purchases.length === 0 ? (
              <div className="p-12 text-center text-secondary">
                <p className="font-semibold text-sm">No hay compras registradas.</p>
              </div>
            ) : (
              purchases.map(p => (
                <div key={p.id} className="p-4 grid grid-cols-12 gap-2 items-center hover:bg-surface-container-low transition-colors text-sm">
                  <div className="col-span-4">
                    <h4 className="font-bold text-on-surface">{p.productNombre}</h4>
                    <span className="text-xs font-semibold text-primary bg-primary-container/30 px-2 py-0.5 rounded-md inline-block mt-0.5">
                      Cantidad: {p.cantidad}
                    </span>
                  </div>

                  <div className="col-span-4 text-xs text-secondary flex flex-col gap-0.5">
                    <span className="font-semibold text-on-surface">🏢 {p.proveedor}</span>
                    <span>📅 {new Date(p.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="col-span-3 text-right">
                    <span className="font-black text-on-surface text-base block">${formatPrice(p.precioTotal)}</span>
                    <span className="text-[10px] text-secondary">Costo unit: ${formatPrice(p.costoUnitario)}</span>
                  </div>

                  <div className="col-span-1 text-right">
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Eliminar el registro de compra de "${p.productNombre}" ($${formatPrice(p.precioTotal)})?`)) {
                          deletePurchase(p.id);
                        }
                      }}
                      className="p-1.5 text-secondary hover:text-error hover:bg-error-container/20 rounded-full transition-colors"
                      title="Eliminar compra"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Registrar Compra */}
        {showPurchaseModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
            <form onSubmit={handlePurchaseSubmit} className="bg-white rounded-3xl p-6 w-full max-w-md flex flex-col gap-4 shadow-xl border border-surface-container-highest max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b pb-3 sticky top-0 bg-white z-10">
                <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined">shopping_bag</span>
                  <span>Registrar Compra de Mercadería</span>
                </h3>
                <button type="button" onClick={() => setShowPurchaseModal(false)} className="text-secondary font-bold hover:text-on-surface">✕</button>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Seleccionar o Crear Producto *</label>
                <select 
                  required
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary font-bold text-on-surface"
                  value={purchaseForm.isNewProduct ? 'new' : purchaseForm.productId}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'new') {
                      setPurchaseForm({
                        ...purchaseForm,
                        isNewProduct: true,
                        productId: '',
                        productNombre: ''
                      });
                    } else {
                      const p = products.find(prod => prod.id === val);
                      setPurchaseForm({
                        ...purchaseForm,
                        isNewProduct: false,
                        productId: val,
                        productNombre: p ? p.nombre : ''
                      });
                    }
                  }}
                >
                  <option value="">-- Seleccionar producto existente --</option>
                  <option value="new" className="font-extrabold text-primary">✨ + Crear y Sumar NUEVO Producto al Inventario</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.tipoVenta})</option>
                  ))}
                </select>
              </div>

              {purchaseForm.isNewProduct && (
                <div className="bg-primary-container/20 border border-primary-container p-3.5 rounded-2xl flex flex-col gap-3 animate-fade-in">
                  <span className="text-xs font-bold text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">add_box</span>
                    <span>Datos para el Nuevo Producto en Inventario:</span>
                  </span>

                  <div>
                    <label className="block text-xs font-bold text-secondary mb-1">Nombre del Nuevo Producto *</label>
                    <input
                      required
                      className="w-full bg-white border border-surface-container-highest rounded-xl p-2.5 text-sm outline-none focus:border-primary font-bold text-on-surface"
                      placeholder="Ej: Aceite de Girasol 1L / Mermelada"
                      value={purchaseForm.productNombre}
                      onChange={e => setPurchaseForm({ ...purchaseForm, productNombre: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-secondary mb-1">Tipo de Venta</label>
                      <select
                        className="w-full bg-white border border-surface-container-highest rounded-xl p-2.5 text-xs outline-none focus:border-primary font-bold text-on-surface"
                        value={purchaseForm.tipoVenta}
                        onChange={e => setPurchaseForm({ ...purchaseForm, tipoVenta: e.target.value })}
                      >
                        <option value="unidad">Por Unidad (un)</option>
                        <option value="kg">Por Kilo (kg)</option>
                        <option value="grs">Por Gramos (100g)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-secondary mb-1">Precio Venta ($)</label>
                      <input
                        type="number"
                        className="w-full bg-white border border-surface-container-highest rounded-xl p-2.5 text-sm outline-none focus:border-primary font-bold text-primary"
                        placeholder="Ej: 3000"
                        value={purchaseForm.precioVenta}
                        onChange={e => setPurchaseForm({ ...purchaseForm, precioVenta: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Proveedor / Distribuidora</label>
                <input
                  required
                  list="suppliers-list"
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary font-bold text-on-surface"
                  placeholder="Ej: Huerta San José / Mercado Abasto"
                  value={purchaseForm.proveedor}
                  onChange={e => setPurchaseForm({ ...purchaseForm, proveedor: e.target.value })}
                />
                <datalist id="suppliers-list">
                  {(contactsData?.suppliers || []).map(s => (
                    <option key={s.id} value={s.nombre}>{s.rubro ? `${s.rubro} - ${s.contacto}` : s.contacto}</option>
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-secondary mb-1">Cantidad Comprada</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary font-bold"
                    placeholder="Ej: 10"
                    value={purchaseForm.cantidad}
                    onChange={e => setPurchaseForm({ ...purchaseForm, cantidad: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-secondary mb-1">Precio TOTAL Pagado ($)</label>
                  <input
                    required
                    type="number"
                    className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary font-bold text-primary"
                    placeholder="Ej: 15000"
                    value={purchaseForm.precioTotal}
                    onChange={e => setPurchaseForm({ ...purchaseForm, precioTotal: e.target.value })}
                  />
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-900 font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-700">bolt</span>
                <span>Al guardar, el stock del inventario y su costo unitario promedio se actualizarán automáticamente.</span>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowPurchaseModal(false)} className="px-4 py-2.5 rounded-xl border text-secondary font-semibold text-sm">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-xl shadow-md">Confirmar Compra</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // 3. SECCIÓN DE PAGOS Y GASTOS FIJOS
  // -------------------------------------------------------------
  if (subView === 'pagos') {
    return (
      <div className="flex flex-col gap-6 animate-fade-in max-w-4xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-surface-container-low shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSubView('dashboard')}
              className="p-2.5 rounded-full bg-surface-container-low hover:bg-surface-container-high text-secondary transition-colors"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
            <div>
              <h2 className="text-xl font-bold text-on-surface">Gestión de Pagos y Gastos Fijos</h2>
              <p className="text-xs text-secondary">Control de egresos por alquiler, servicios, sueldos e impuestos</p>
            </div>
          </div>

          <button
            onClick={() => setShowExpenseModal(true)}
            className="bg-primary text-white font-bold px-5 py-2.5 rounded-full text-xs shadow-md hover:bg-surface-tint flex items-center gap-2 transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Nuevo Gasto</span>
          </button>
        </div>

        {/* Metrics Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-surface-container-low border-t-4 border-t-error shadow-sm flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-error uppercase tracking-wider block">Egresos Pendientes</span>
              <span className="text-2xl font-black text-error mt-1">${formatPrice(totalGastosFijosPendientes)}</span>
            </div>
            <span className="material-symbols-outlined text-error text-3xl">warning</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-surface-container-low border-t-4 border-t-emerald-600 shadow-sm flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Egresos Pagados</span>
              <span className="text-2xl font-black text-emerald-700 mt-1">${formatPrice(totalGastosFijosPagados)}</span>
            </div>
            <span className="material-symbols-outlined text-emerald-600 text-3xl">task_alt</span>
          </div>
        </div>

        {/* Expenses List */}
        <div className="bg-white rounded-2xl shadow-sm border border-surface-container-low overflow-hidden">
          <div className="p-4 bg-surface-container-low border-b font-bold text-xs text-secondary uppercase tracking-wider grid grid-cols-12 gap-2">
            <div className="col-span-4">Concepto & Categoría</div>
            <div className="col-span-4">Estado</div>
            <div className="col-span-3 text-right">Monto</div>
            <div className="col-span-1 text-right">Acción</div>
          </div>

          <div className="divide-y divide-surface-container-highest">
            {expenses.length === 0 ? (
              <div className="p-12 text-center text-secondary">
                <p className="font-semibold text-sm">No hay gastos fijos registrados.</p>
              </div>
            ) : (
              expenses.map(e => (
                <div key={e.id} className="p-4 grid grid-cols-12 gap-2 items-center hover:bg-surface-container-low transition-colors text-sm">
                  <div className="col-span-4">
                    <h4 className="font-bold text-on-surface">{e.concepto}</h4>
                    <span className="text-xs font-semibold text-secondary bg-surface-container-high px-2 py-0.5 rounded-md inline-block mt-0.5">
                      {e.categoria}
                    </span>
                  </div>

                  <div className="col-span-4">
                    <button
                      onClick={() => toggleExpenseStatus(e)}
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all active:scale-95 ${
                        e.estado === 'Pagado'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {e.estado === 'Pagado' ? 'check_circle' : 'pending'}
                      </span>
                      <span>{e.estado}</span>
                    </button>
                  </div>

                  <div className="col-span-3 text-right">
                    <span className="font-black text-on-surface text-base block">${formatPrice(e.monto)}</span>
                  </div>

                  <div className="col-span-1 text-right">
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Eliminar el gasto "${e.concepto}" ($${formatPrice(e.monto)})?`)) {
                          deleteExpense(e.id);
                        }
                      }}
                      className="p-1.5 text-secondary hover:text-error hover:bg-error-container/20 rounded-full transition-colors"
                      title="Eliminar gasto"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Nuevo Gasto */}
        {showExpenseModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
            <form onSubmit={handleExpenseSubmit} className="bg-white rounded-3xl p-6 w-full max-w-md flex flex-col gap-4 shadow-xl border border-surface-container-highest">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined">payments</span>
                  <span>Nuevo Gasto Fijo / Pago</span>
                </h3>
                <button type="button" onClick={() => setShowExpenseModal(false)} className="text-secondary font-bold">✕</button>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Concepto del Gasto</label>
                <input
                  required
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary"
                  placeholder="Ej: Alquiler del local / Luz Edenor / Sueldos"
                  value={expenseForm.concepto}
                  onChange={e => setExpenseForm({ ...expenseForm, concepto: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-secondary mb-1">Categoría</label>
                  <select 
                    className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary font-semibold"
                    value={expenseForm.categoria}
                    onChange={e => setExpenseForm({ ...expenseForm, categoria: e.target.value })}
                  >
                    <option value="Alquiler">Alquiler</option>
                    <option value="Servicios">Servicios (Luz/Agua)</option>
                    <option value="Sueldos">Sueldos</option>
                    <option value="Impuestos">Impuestos</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-secondary mb-1">Monto ($)</label>
                  <input
                    required
                    type="number"
                    className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary font-bold text-primary"
                    placeholder="Ej: 25000"
                    value={expenseForm.monto}
                    onChange={e => setExpenseForm({ ...expenseForm, monto: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Estado de Pago</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                    <input 
                      type="radio" 
                      name="estado" 
                      value="Pendiente" 
                      checked={expenseForm.estado === 'Pendiente'}
                      onChange={e => setExpenseForm({ ...expenseForm, estado: e.target.value })}
                    />
                    <span>Pendiente</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                    <input 
                      type="radio" 
                      name="estado" 
                      value="Pagado" 
                      checked={expenseForm.estado === 'Pagado'}
                      onChange={e => setExpenseForm({ ...expenseForm, estado: e.target.value })}
                    />
                    <span>Pagado</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2.5 rounded-xl border text-secondary font-semibold text-sm">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-xl shadow-md">Guardar Gasto</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // 4. SECCIÓN DE INGRESOS Y GASTOS EXTRAS
  // -------------------------------------------------------------
  if (subView === 'extras') {
    return (
      <div className="flex flex-col gap-6 animate-fade-in max-w-4xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-surface-container-low shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSubView('dashboard')}
              className="p-2.5 rounded-full bg-surface-container-low hover:bg-surface-container-high text-secondary transition-colors"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
            <div>
              <h2 className="text-xl font-bold text-on-surface">Ingresos y Gastos Extras</h2>
              <p className="text-xs text-secondary">Registro de movimientos no estandarizados del negocio</p>
            </div>
          </div>

          <button
            onClick={() => setShowExtraModal(true)}
            className="bg-primary text-white font-bold px-5 py-2.5 rounded-full text-xs shadow-md hover:bg-surface-tint flex items-center gap-2 transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Nuevo Movimiento</span>
          </button>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-surface-container-low border-t-4 border-t-emerald-600 shadow-sm flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Total Ingresos Extras</span>
              <span className="text-2xl font-black text-emerald-700 mt-1">+${formatPrice(totalIngresosExtras)}</span>
            </div>
            <span className="material-symbols-outlined text-emerald-600 text-3xl">trending_up</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-surface-container-low border-t-4 border-t-error shadow-sm flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-error uppercase tracking-wider block">Total Gastos Extras</span>
              <span className="text-2xl font-black text-error mt-1">-${formatPrice(totalGastosExtras)}</span>
            </div>
            <span className="material-symbols-outlined text-error text-3xl">trending_down</span>
          </div>
        </div>

        {/* Extras List */}
        <div className="bg-white rounded-2xl shadow-sm border border-surface-container-low overflow-hidden">
          <div className="p-4 bg-surface-container-low border-b font-bold text-xs text-secondary uppercase tracking-wider grid grid-cols-12 gap-2">
            <div className="col-span-5">Concepto & Tipo</div>
            <div className="col-span-3">Fecha</div>
            <div className="col-span-3 text-right">Monto</div>
            <div className="col-span-1 text-right">Acción</div>
          </div>

          <div className="divide-y divide-surface-container-highest">
            {extraMovements.length === 0 ? (
              <div className="p-12 text-center text-secondary">
                <p className="font-semibold text-sm">No hay movimientos extras registrados.</p>
              </div>
            ) : (
              extraMovements.map(m => (
                <div key={m.id} className="p-4 grid grid-cols-12 gap-2 items-center hover:bg-surface-container-low transition-colors text-sm">
                  <div className="col-span-5">
                    <h4 className="font-bold text-on-surface">{m.concepto}</h4>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md inline-block mt-0.5 ${
                      m.tipo === 'ingreso' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {m.tipo === 'ingreso' ? 'INGRESO EXTRA' : 'GASTO EXTRA'}
                    </span>
                  </div>

                  <div className="col-span-3 text-xs text-secondary">
                    📅 {new Date(m.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                  </div>

                  <div className="col-span-3 text-right">
                    <span className={`font-black text-base block ${m.tipo === 'ingreso' ? 'text-emerald-700' : 'text-error'}`}>
                      {m.tipo === 'ingreso' ? '+' : '-'}${formatPrice(m.monto)}
                    </span>
                  </div>

                  <div className="col-span-1 text-right">
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Eliminar el movimiento extra "${m.concepto}" ($${formatPrice(m.monto)})?`)) {
                          deleteExtraMovement(m.id);
                        }
                      }}
                      className="p-1.5 text-secondary hover:text-error hover:bg-error-container/20 rounded-full transition-colors"
                      title="Eliminar movimiento"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Nuevo Movimiento Extra */}
        {showExtraModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
            <form onSubmit={handleExtraSubmit} className="bg-white rounded-3xl p-6 w-full max-w-md flex flex-col gap-4 shadow-xl border border-surface-container-highest">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined">more_horiz</span>
                  <span>Nuevo Movimiento Extra</span>
                </h3>
                <button type="button" onClick={() => setShowExtraModal(false)} className="text-secondary font-bold">✕</button>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Tipo de Movimiento</label>
                <select 
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary font-bold"
                  value={extraForm.tipo}
                  onChange={e => setExtraForm({ ...extraForm, tipo: e.target.value })}
                >
                  <option value="ingreso">🟢 Ingreso Extra (ej: Venta de cajones/pallets)</option>
                  <option value="gasto">🔴 Gasto Extra (ej: Reparación de balanza/Limpieza)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Concepto / Descripción</label>
                <input
                  required
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary"
                  placeholder="Ej: Venta de pallets usados / Artículos de limpieza"
                  value={extraForm.concepto}
                  onChange={e => setExtraForm({ ...extraForm, concepto: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Monto ($)</label>
                <input
                  required
                  type="number"
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary font-bold text-primary"
                  placeholder="Ej: 4500"
                  value={extraForm.monto}
                  onChange={e => setExtraForm({ ...extraForm, monto: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowExtraModal(false)} className="px-4 py-2.5 rounded-xl border text-secondary font-semibold text-sm">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-xl shadow-md">Guardar Movimiento</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // 5. SECCIÓN DE VENTAS (HISTORIAL)
  // -------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-surface-container-low shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSubView('dashboard')}
            className="p-2.5 rounded-full bg-surface-container-low hover:bg-surface-container-high text-secondary transition-colors"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div>
            <h2 className="text-xl font-bold text-on-surface">Historial de Ventas</h2>
            <p className="text-xs text-secondary">Registro completo de ventas por Mostrador y Delivery</p>
          </div>
        </div>

        <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-3 py-1 rounded-full">
          Total: ${formatPrice(totalVentas)}
        </span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-surface-container-low overflow-hidden">
        <div className="p-4 bg-surface-container-low border-b font-bold text-xs text-secondary uppercase tracking-wider grid grid-cols-12 gap-2">
          <div className="col-span-4">Cliente & Tipo</div>
          <div className="col-span-4">Fecha</div>
          <div className="col-span-3 text-right">Total</div>
          <div className="col-span-1 text-right">Acción</div>
        </div>

        <div className="divide-y divide-surface-container-highest">
          {sales.length === 0 ? (
            <div className="p-12 text-center text-secondary">
              <p className="font-semibold text-sm">No hay ventas registradas.</p>
            </div>
          ) : (
            sales.map(s => (
              <div key={s.id} className="p-4 grid grid-cols-12 gap-2 items-center hover:bg-surface-container-low transition-colors text-sm">
                <div className="col-span-4">
                  <h4 className="font-bold text-on-surface">{s.cliente || 'Mostrador'}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-block mt-0.5 ${
                    s.type === 'Delivery' ? 'bg-amber-100 text-amber-900' : 'bg-primary-container/30 text-primary'
                  }`}>
                    {s.type || 'Local'}
                  </span>
                </div>

                <div className="col-span-4 text-xs text-secondary">
                  📅 {new Date(s.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>

                <div className="col-span-3 text-right">
                  <span className="font-black text-primary text-base block">${formatPrice(s.total)}</span>
                </div>

                <div className="col-span-1 text-right">
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Eliminar la venta de ${s.cliente || 'Mostrador'} ($${formatPrice(s.total)}) del historial?`)) {
                        salesData.deleteSale(s.id);
                      }
                    }}
                    className="p-1.5 text-secondary hover:text-error hover:bg-error-container/20 rounded-full transition-colors"
                    title="Eliminar venta del historial"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
