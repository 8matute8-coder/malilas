import React, { useState, useMemo } from 'react';

export default function Contabilidad({ accountingData, inventoryData, salesData, contactsData, ordersData }) {
  const { 
    purchases = [], expenses = [], extraMovements = [], 
    recordPurchase, updatePurchaseCategory, deletePurchase, 
    recordExpense, toggleExpenseStatus, deleteExpense, 
    recordExtraMovement, deleteExtraMovement 
  } = accountingData || {};

  const { products = [], saveProduct } = inventoryData || {};
  const { sales = [], deleteSale } = salesData || {};

  // Filter States for the Unified Excel Table
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('todos'); // 'todos', 'Venta', 'Compra', 'Gasto'
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [timeFilter, setTimeFilter] = useState('mes'); // 'hoy', 'semana', 'mes', 'todo'

  const [showStats, setShowStats] = useState(false);
  const [selectedTransactionDetail, setSelectedTransactionDetail] = useState(null);

  // Form Modals
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    productId: '', 
    productNombre: '', 
    proveedor: '', 
    cantidad: '', 
    precioTotal: '',
    categoria: 'Mercadería (Stock)',
    isNewProduct: false,
    tipoVenta: 'unidad',
    precioVenta: '',
    porcentajeGanancia: '50'
  });

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    concepto: '', categoria: 'Servicios', monto: '', estado: 'Pagado'
  });

  const [showExtraModal, setShowExtraModal] = useState(false);
  const [extraForm, setExtraForm] = useState({
    tipo: 'ingreso', concepto: '', monto: ''
  });

  const formatPrice = (num) => Math.round(Number(num) || 0).toLocaleString('es-AR');

  // -------------------------------------------------------------
  // UNIFIED MASTER LEDGER ARRAY (Combines Ventas + Compras + Gastos + Extras)
  // -------------------------------------------------------------
  const masterLedger = useMemo(() => {
    const list = [];

    // 1. Sales (Ventas)
    (sales || []).forEach(s => {
      const sDate = new Date(s.fecha);
      const isCalc = s.type === 'Venta Rápida' || s.originalOrder === 'Mostrador (Calculadora)' || s.cliente === 'Mostrador (Calculadora)';
      
      list.push({
        id: `sale-${s.id}`,
        originalId: s.id,
        rawDate: sDate,
        fechaFormatted: sDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        tipo: 'Venta',
        tipoBadgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        tipoIcon: 'trending_up',
        categoria: s.type === 'Delivery' ? 'Delivery / Online' : (isCalc ? 'Venta por Calculadora' : 'Venta Mostrador'),
        proveedorCliente: s.cliente || (isCalc ? `Venta N° ${s.ventaNumero || s.id.slice(0,4)}` : 'Cliente Mostrador'),
        monto: s.total || 0,
        isIncome: true,
        recordType: 'sale',
        raw: s
      });
    });

    // 2. Purchases (Compras)
    (purchases || []).forEach(p => {
      const pDate = new Date(p.fecha);
      list.push({
        id: `purchase-${p.id}`,
        originalId: p.id,
        rawDate: pDate,
        fechaFormatted: pDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        tipo: 'Compra',
        tipoBadgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
        tipoIcon: 'shopping_bag',
        categoria: p.categoria || 'Mercadería (Stock)',
        proveedorCliente: p.proveedor || 'Proveedor General',
        monto: -(p.precioTotal || 0),
        isIncome: false,
        recordType: 'purchase',
        raw: p
      });
    });

    // 3. Gastos Fijos (Expenses)
    (expenses || []).forEach(e => {
      const eDate = new Date(e.fecha);
      list.push({
        id: `expense-${e.id}`,
        originalId: e.id,
        rawDate: eDate,
        fechaFormatted: eDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        tipo: 'Gasto Fijo',
        tipoBadgeColor: 'bg-amber-100 text-amber-950 border-amber-300',
        tipoIcon: 'receipt_long',
        categoria: e.categoria || 'Servicios',
        proveedorCliente: e.concepto || 'Gasto Operativo',
        monto: -(e.monto || 0),
        isIncome: false,
        recordType: 'expense',
        raw: e
      });
    });

    // 4. Extra Movements
    (extraMovements || []).forEach(m => {
      const mDate = new Date(m.fecha);
      const isIngreso = m.tipo === 'ingreso';
      list.push({
        id: `extra-${m.id}`,
        originalId: m.id,
        rawDate: mDate,
        fechaFormatted: mDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        tipo: isIngreso ? 'Ingreso Extra' : 'Gasto Extra',
        tipoBadgeColor: isIngreso ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-purple-100 text-purple-900 border-purple-300',
        tipoIcon: isIngreso ? 'add_circle' : 'remove_circle',
        categoria: isIngreso ? 'Otros Ingresos' : 'Gastos Extras',
        proveedorCliente: m.concepto || 'Movimiento Ajuste',
        monto: isIngreso ? (m.monto || 0) : -(m.monto || 0),
        isIncome: isIngreso,
        recordType: 'extra',
        raw: m
      });
    });

    // Sort chronologically descending (newest first)
    return list.sort((a, b) => b.rawDate - a.rawDate);
  }, [sales, purchases, expenses, extraMovements]);

  // -------------------------------------------------------------
  // FILTERED LEDGER ARRAY
  // -------------------------------------------------------------
  const filteredLedger = useMemo(() => {
    const now = new Date();

    return masterLedger.filter(item => {
      // 1. Time Filter
      if (timeFilter === 'hoy') {
        if (item.rawDate.toDateString() !== now.toDateString()) return false;
      } else if (timeFilter === 'semana') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        if (item.rawDate < startOfWeek) return false;
      } else if (timeFilter === 'mes') {
        if (item.rawDate.getMonth() !== now.getMonth() || item.rawDate.getFullYear() !== now.getFullYear()) return false;
      }

      // 2. Type Filter
      if (typeFilter !== 'todos') {
        if (typeFilter === 'Venta' && !item.isIncome) return false;
        if (typeFilter === 'Compra' && item.recordType !== 'purchase') return false;
        if (typeFilter === 'Gasto' && item.recordType !== 'expense' && (item.recordType !== 'extra' || item.isIncome)) return false;
      }

      // 3. Category Filter
      if (categoryFilter !== 'todas') {
        if (!item.categoria.toLowerCase().includes(categoryFilter.toLowerCase())) return false;
      }

      // 4. Text Search Term
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const prov = (item.proveedorCliente || '').toLowerCase();
        const cat = (item.categoria || '').toLowerCase();
        const tipo = (item.tipo || '').toLowerCase();
        const prod = item.raw.productNombre ? item.raw.productNombre.toLowerCase() : '';
        if (!prov.includes(term) && !cat.includes(term) && !tipo.includes(term) && !prod.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [masterLedger, timeFilter, typeFilter, categoryFilter, searchTerm]);

  // -------------------------------------------------------------
  // METRICS & STATS CALCULATIONS (Unified)
  // -------------------------------------------------------------
  const statsSummary = useMemo(() => {
    let ingresos = 0;
    let egresos = 0;
    let comprasStock = 0;
    let comprasInsumos = 0;
    let gastosFijos = 0;

    filteredLedger.forEach(item => {
      if (item.monto > 0) {
        ingresos += item.monto;
      } else {
        const absMonto = Math.abs(item.monto);
        egresos += absMonto;

        if (item.recordType === 'purchase') {
          if (!item.categoria || item.categoria.includes('Mercadería') || item.categoria.includes('Stock')) {
            comprasStock += absMonto;
          } else {
            comprasInsumos += absMonto;
          }
        } else if (item.recordType === 'expense') {
          gastosFijos += absMonto;
        }
      }
    });

    const balance = ingresos - egresos;
    return { ingresos, egresos, comprasStock, comprasInsumos, gastosFijos, balance };
  }, [filteredLedger]);

  // Integrated Top Selling Products Stats
  const topProductsStats = useMemo(() => {
    const productCounts = {};

    (sales || []).forEach(sale => {
      const isCalculatorSale = 
        sale.type === 'Venta Rápida' ||
        sale.originalOrder === 'Mostrador (Calculadora)' ||
        sale.cliente === 'Mostrador (Calculadora)';

      if (!isCalculatorSale && sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          if (!item.product || !item.product.nombre) return;
          const pName = item.product.nombre;
          if (pName.startsWith('Item ') || pName.startsWith('Monto ') || item.isCalculator) return;

          let itemQty = parseFloat(item.quantity) || 0;
          let mult = item.product.tipoVenta === 'grs' ? (itemQty / 100) : itemQty;

          if (!productCounts[pName]) {
            productCounts[pName] = {
              quantity: 0,
              revenue: 0,
              tipoVenta: item.product.tipoVenta || 'unidad'
            };
          }
          productCounts[pName].quantity += itemQty;
          productCounts[pName].revenue += (mult * (item.product.precioVenta || 0));
        });
      }
    });

    return Object.entries(productCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [sales]);

  // Export Table to CSV / Excel
  const exportToCSV = () => {
    if (filteredLedger.length === 0) {
      alert('No hay movimientos en el historial para exportar.');
      return;
    }

    const headers = ['Fecha y Hora', 'Tipo', 'Categoria', 'Proveedor / Detalle', 'Monto ($)'];
    const rows = filteredLedger.map(item => [
      `"${item.fechaFormatted}"`,
      `"${item.tipo}"`,
      `"${item.categoria}"`,
      `"${item.proveedorCliente.replace(/"/g, '""')}"`,
      item.monto
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Contabilidad_LaMalila_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Form Submissions
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

    if (purchaseForm.isNewProduct || !targetProductId) {
      if (!pNombre) {
        alert('Por favor ingresa el nombre del producto.');
        return;
      }

      const salePrice = parseFloat(purchaseForm.precioVenta) || Math.round(unitCost * 1.5);
      const newProdData = {
        nombre: pNombre,
        tipoVenta: purchaseForm.tipoVenta || 'unidad',
        stockActual: qty,
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
      costoUnitario: unitCost,
      categoria: purchaseForm.categoria || 'Mercadería (Stock)'
    });

    setPurchaseForm({
      productId: '', productNombre: '', proveedor: '', cantidad: '', precioTotal: '',
      categoria: 'Mercadería (Stock)',
      isNewProduct: false, tipoVenta: 'unidad', precioVenta: '', porcentajeGanancia: '50'
    });
    setProductSearchQuery('');
    setShowProductDropdown(false);
    setShowPurchaseModal(false);
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseForm.concepto || parseFloat(expenseForm.monto) <= 0) {
      alert('Por favor ingresa un concepto y monto válido.');
      return;
    }
    await recordExpense(expenseForm);
    setExpenseForm({ concepto: '', categoria: 'Servicios', monto: '', estado: 'Pagado' });
    setShowExpenseModal(false);
  };

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

  const handleDeleteRecord = async (item) => {
    if (window.confirm(`¿Estás seguro de eliminar este registro (${item.tipo}: ${item.proveedorCliente})?`)) {
      if (item.recordType === 'purchase') {
        await deletePurchase(item.originalId);
      } else if (item.recordType === 'expense') {
        await deleteExpense(item.originalId);
      } else if (item.recordType === 'extra') {
        await deleteExtraMovement(item.originalId);
      } else if (item.recordType === 'sale' && deleteSale) {
        await deleteSale(item.originalId);
      }
    }
  };

  const filteredProductsForPurchase = products.filter(p =>
    p.nombre.toLowerCase().includes((productSearchQuery || '').toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-7xl mx-auto w-full">
      {/* Header Dashboard & Action Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-surface-container-low shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-on-surface tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">account_balance</span>
            <span>Dashboard Contable Unificado</span>
          </h2>
          <p className="text-xs text-secondary font-medium">Control financiero integral de Compras, Ventas, Gastos y Estadísticas</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs border ${
              showStats ? 'bg-primary text-white border-primary' : 'bg-surface-container-low text-primary border-primary-container hover:bg-primary-container/20'
            }`}
          >
            <span className="material-symbols-outlined text-base">insights</span>
            <span>{showStats ? 'Ocultar Stats' : '📊 Ver Stats de Productos'}</span>
          </button>

          <button
            onClick={() => setShowPurchaseModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-base">shopping_bag</span>
            <span>+ Compra Mercadería</span>
          </button>

          <button
            onClick={() => setShowExpenseModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-base">receipt_long</span>
            <span>+ Gasto / Servicio</span>
          </button>

          <button
            onClick={() => setShowExtraModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-base">more_horiz</span>
            <span>+ Movimiento Extra</span>
          </button>
        </div>
      </div>

      {/* Metrics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container-low border-l-4 border-l-emerald-600 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center text-secondary mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Ingresos Totales (Ventas)</span>
              <span className="material-symbols-outlined text-emerald-600">trending_up</span>
            </div>
            <h3 className="text-3xl font-black text-on-surface">${formatPrice(statsSummary.ingresos)}</h3>
          </div>
          <span className="text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 mt-3 w-fit">
            Ventas Registradas
          </span>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container-low border-l-4 border-l-rose-600 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center text-secondary mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Egresos Totales (Compras/Gastos)</span>
              <span className="material-symbols-outlined text-rose-600">trending_down</span>
            </div>
            <h3 className="text-3xl font-black text-on-surface">${formatPrice(statsSummary.egresos)}</h3>
          </div>
          <div className="text-[11px] text-rose-900 font-bold flex flex-wrap gap-1 mt-3">
            <span className="bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">Stock: ${formatPrice(statsSummary.comprasStock)}</span>
            <span className="bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">Insumos/Gastos: ${formatPrice(statsSummary.comprasInsumos + statsSummary.gastosFijos)}</span>
          </div>
        </div>

        <div className={`rounded-3xl p-6 shadow-md flex flex-col justify-between text-white ${
          statsSummary.balance >= 0 
            ? 'bg-gradient-to-br from-emerald-950 to-primary border border-white/10' 
            : 'bg-gradient-to-br from-red-950 to-error border border-white/10'
        }`}>
          <div>
            <div className="flex justify-between items-center text-white/80 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Balance General Neto</span>
              <span className="material-symbols-outlined">{statsSummary.balance >= 0 ? 'account_balance_wallet' : 'warning'}</span>
            </div>
            <h3 className="text-3xl font-black tracking-tight">${formatPrice(statsSummary.balance)}</h3>
          </div>
          <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold w-fit mt-3 backdrop-blur-xs">
            {statsSummary.balance >= 0 ? '✓ Flujo neto positivo' : '⚠ Flujo neto negativo'}
          </span>
        </div>
      </div>

      {/* Integrated Stats Section (Collapsible) */}
      {showStats && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-surface-container-low animate-fade-in flex flex-col gap-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">insights</span>
              <span>Top 10 Productos Más Vendidos</span>
            </h3>
            <span className="text-xs text-secondary font-semibold">Basado en volumen de recaudación de ventas</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {topProductsStats.length === 0 ? (
              <p className="text-xs text-secondary italic col-span-2">No hay datos suficientes de ventas detalladas para generar estadísticas.</p>
            ) : (
              topProductsStats.map((item, idx) => (
                <div key={item.name} className="flex justify-between items-center bg-surface-container-low p-3 rounded-2xl border border-surface-container-highest">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-primary text-white font-black text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-on-surface text-sm">{item.name}</h4>
                      <span className="text-xs text-secondary font-semibold">
                        Vendidos: {item.quantity} {item.tipoVenta === 'grs' ? 'g' : item.tipoVenta}
                      </span>
                    </div>
                  </div>
                  <span className="font-black text-primary text-sm">${formatPrice(item.revenue)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Excel Table Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-surface-container-low shadow-sm flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
        {/* Search Input */}
        <div className="relative flex-grow max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-lg">
            search
          </span>
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-surface-container-highest focus:border-primary outline-none bg-surface-container-low text-xs font-bold text-on-surface"
            placeholder="Buscar por proveedor, cliente, concepto o producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Filter */}
          <select
            className="bg-surface-container-low border border-surface-container-highest rounded-xl px-3 py-2.5 text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
          >
            <option value="hoy">📅 Hoy</option>
            <option value="semana">📅 Esta Semana</option>
            <option value="mes">📅 Este Mes</option>
            <option value="todo">📅 Todo el Historial</option>
          </select>

          {/* Type Filter */}
          <select
            className="bg-surface-container-low border border-surface-container-highest rounded-xl px-3 py-2.5 text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="todos">🏷️ Todos los Tipos</option>
            <option value="Venta">🟢 Solo Ventas</option>
            <option value="Compra">🔴 Solo Compras</option>
            <option value="Gasto">📙 Solo Gastos / Extras</option>
          </select>

          {/* Category Filter */}
          <select
            className="bg-surface-container-low border border-surface-container-highest rounded-xl px-3 py-2.5 text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="todas">📁 Todas las Categorías</option>
            <option value="Mercadería">📦 Mercadería (Stock)</option>
            <option value="Insumos">🛍️ Insumos / Embalaje</option>
            <option value="Gastos">🛒 Gastos Extras</option>
            <option value="Servicios">💡 Servicios / Alquiler</option>
            <option value="Venta">🛒 Ventas</option>
          </select>

          {/* Export to Excel CSV Button */}
          <button
            onClick={exportToCSV}
            className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 px-3.5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Descargar este historial en formato Excel / CSV"
          >
            <span className="material-symbols-outlined text-base text-emerald-700">download</span>
            <span>Exportar a Excel</span>
          </button>
        </div>
      </div>

      {/* SINGLE UNIFIED EXCEL-LIKE TABLE */}
      <div className="bg-white rounded-3xl shadow-sm border border-surface-container-low overflow-hidden">
        <div className="px-6 py-4 bg-surface-container-low border-b border-surface-container-highest flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">table_chart</span>
            <h3 className="font-extrabold text-on-surface text-base">Historial Único Unificado de Transacciones</h3>
          </div>
          <span className="text-xs font-bold text-secondary bg-white px-3 py-1 rounded-full border border-surface-container-highest">
            {filteredLedger.length} movimientos encontrados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/70 border-b border-surface-container-highest text-[11px] font-bold text-secondary uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">Fecha y Hora</th>
                <th className="py-3.5 px-3">Tipo</th>
                <th className="py-3.5 px-3">Categoría</th>
                <th className="py-3.5 px-3">Proveedor / Detalle</th>
                <th className="py-3.5 px-3 text-right">Total Pagado / Cobrado</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-highest text-xs font-semibold">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-secondary italic">
                    No se encontraron transacciones que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredLedger.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-low/60 transition-colors">
                    {/* Fecha y Hora */}
                    <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap text-on-surface font-bold">
                      {item.fechaFormatted}
                    </td>

                    {/* Tipo Badge */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-lg border font-extrabold text-[11px] inline-flex items-center gap-1 shadow-2xs ${item.tipoBadgeColor}`}>
                        <span className="material-symbols-outlined text-xs">{item.tipoIcon}</span>
                        <span>{item.tipo}</span>
                      </span>
                    </td>

                    {/* Categoría (Editable for Purchases) */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {item.recordType === 'purchase' ? (
                        <select
                          className="bg-white border border-surface-container-highest rounded-lg px-2 py-1 text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer shadow-2xs"
                          value={item.categoria}
                          onChange={(e) => updatePurchaseCategory && updatePurchaseCategory(item.originalId, e.target.value)}
                        >
                          <option value="📦 Mercadería (Stock)">📦 Mercadería (Stock)</option>
                          <option value="🛍️ Insumos / Embalaje (Bolsas, Cinta, Film)">🛍️ Insumos / Embalaje</option>
                          <option value="🛒 Gastos Extras">🛒 Gastos Extras</option>
                          <option value="💡 Servicios / Alquiler">💡 Servicios / Alquiler</option>
                        </select>
                      ) : (
                        <span className="bg-surface-container-high text-on-surface px-2.5 py-1 rounded-lg text-xs font-bold inline-block border border-surface-container-highest">
                          {item.categoria}
                        </span>
                      )}
                    </td>

                    {/* Proveedor / Detalle */}
                    <td className="py-3.5 px-3 font-bold text-on-surface">
                      <div className="flex items-center gap-1.5">
                        <span>{item.proveedorCliente}</span>
                        {item.raw.productNombre && (
                          <span className="text-[11px] font-semibold text-secondary">({item.raw.productNombre})</span>
                        )}
                      </div>
                    </td>

                    {/* Total Pagado / Cobrado ($) */}
                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <span className={`font-black text-sm block ${item.monto > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {item.monto > 0 ? '+' : ''}${formatPrice(item.monto)}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                      <div className="flex justify-end items-center gap-1">
                        <button
                          onClick={() => setSelectedTransactionDetail(item)}
                          className="p-1.5 text-secondary hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors"
                          title="Ver detalle completo"
                        >
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(item)}
                          className="p-1.5 text-secondary hover:text-error hover:bg-error-container/20 rounded-lg transition-colors"
                          title="Eliminar este registro"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalle de Transacción */}
      {selectedTransactionDetail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-surface-container-highest flex flex-col gap-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">receipt</span>
                  <span>Detalle de Transacción</span>
                </h3>
                <p className="text-xs text-secondary font-semibold mt-0.5">{selectedTransactionDetail.fechaFormatted}</p>
              </div>
              <button
                onClick={() => setSelectedTransactionDetail(null)}
                className="text-secondary hover:text-on-surface font-bold text-base p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="bg-surface-container-low p-3.5 rounded-2xl border border-surface-container-highest flex justify-between items-center font-bold">
                <span className="text-secondary">Tipo:</span>
                <span className={`px-2.5 py-0.5 rounded-md border text-xs font-black ${selectedTransactionDetail.tipoBadgeColor}`}>
                  {selectedTransactionDetail.tipo}
                </span>
              </div>

              <div className="bg-surface-container-low p-3.5 rounded-2xl border border-surface-container-highest flex justify-between items-center font-bold">
                <span className="text-secondary">Categoría:</span>
                <span className="text-on-surface">{selectedTransactionDetail.categoria}</span>
              </div>

              <div className="bg-surface-container-low p-3.5 rounded-2xl border border-surface-container-highest flex justify-between items-center font-bold">
                <span className="text-secondary">Proveedor / Cliente / Detalle:</span>
                <span className="text-on-surface">{selectedTransactionDetail.proveedorCliente}</span>
              </div>

              <div className="bg-surface-container-low p-3.5 rounded-2xl border border-surface-container-highest flex justify-between items-center font-bold text-sm">
                <span className="text-secondary">Monto Total:</span>
                <span className={`font-black text-base ${selectedTransactionDetail.monto > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {selectedTransactionDetail.monto > 0 ? '+' : ''}${formatPrice(selectedTransactionDetail.monto)}
                </span>
              </div>

              {/* Items Breakdown if Sale */}
              {selectedTransactionDetail.recordType === 'sale' && selectedTransactionDetail.raw?.items && (
                <div className="border-t pt-2 mt-1">
                  <span className="font-bold text-on-surface block mb-2">Desglose de Productos Vendidos:</span>
                  <div className="bg-surface-container-low rounded-xl p-3 divide-y divide-surface-container-highest">
                    {selectedTransactionDetail.raw.items.map((it, idx) => (
                      <div key={idx} className="py-1.5 flex justify-between font-semibold">
                        <span>{it.product?.nombre || 'Producto'} x {it.quantity}</span>
                        <span className="font-bold text-on-surface">${formatPrice((it.quantity * (it.product?.precioVenta || 0)))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-3 flex justify-end">
              <button
                onClick={() => setSelectedTransactionDetail(null)}
                className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-xs shadow-sm hover:bg-surface-tint"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Compra */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <form onSubmit={handlePurchaseSubmit} className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-surface-container-highest flex flex-col gap-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-700">shopping_bag</span>
                <span>Registrar Compra de Mercadería</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPurchaseModal(false)}
                className="text-secondary hover:text-on-surface font-bold text-base p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="relative">
                <label className="block text-xs font-bold text-secondary mb-1">Buscar Producto o Crear Nuevo *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 pr-8 text-sm outline-none focus:border-primary font-bold text-on-surface"
                    placeholder="🔍 Escribir nombre del producto..."
                    value={productSearchQuery}
                    onChange={e => {
                      const val = e.target.value;
                      setProductSearchQuery(val);
                      setShowProductDropdown(true);
                      setPurchaseForm(prev => ({
                        ...prev,
                        productId: '',
                        productNombre: val,
                        isNewProduct: false
                      }));
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                  />
                  {productSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setProductSearchQuery('');
                        setShowProductDropdown(false);
                        setPurchaseForm(prev => ({
                          ...prev,
                          productId: '',
                          productNombre: '',
                          isNewProduct: false
                        }));
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface font-bold text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {showProductDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-surface-container-highest rounded-2xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-surface-container-highest">
                    {filteredProductsForPurchase.length === 0 ? (
                      <div className="p-3 text-xs text-secondary italic text-center">
                        No se encontraron productos existentes con "{productSearchQuery}"
                      </div>
                    ) : (
                      filteredProductsForPurchase.map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setPurchaseForm(prev => ({
                              ...prev,
                              productId: p.id,
                              productNombre: p.nombre,
                              isNewProduct: false
                            }));
                            setProductSearchQuery(`${p.nombre} (${p.tipoVenta === 'unidad' ? 'un' : p.tipoVenta})`);
                            setShowProductDropdown(false);
                          }}
                          className="p-3 hover:bg-primary-container/20 cursor-pointer flex justify-between items-center text-sm font-semibold transition-colors"
                        >
                          <span className="font-bold text-on-surface">{p.nombre}</span>
                          <span className="text-xs bg-surface-container-high px-2 py-0.5 rounded-md text-secondary font-bold">
                            {p.tipoVenta} • Stock: {p.stockActual}
                          </span>
                        </div>
                      ))
                    )}

                    <div
                      onClick={() => {
                        const newName = productSearchQuery.trim() || 'Nuevo Producto';
                        setPurchaseForm(prev => ({
                          ...prev,
                          productId: '',
                          productNombre: newName,
                          isNewProduct: true
                        }));
                        setProductSearchQuery(newName);
                        setShowProductDropdown(false);
                      }}
                      className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 cursor-pointer flex items-center gap-2 text-xs font-extrabold transition-colors border-t border-emerald-200"
                    >
                      <span className="material-symbols-outlined text-base text-emerald-700">add_circle</span>
                      <span>✨ + Crear "{productSearchQuery || 'Nuevo Producto'}" como NUEVO producto en inventario</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Proveedor / Distribuidora</label>
                <input
                  type="text"
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-2.5 text-sm outline-none focus:border-primary font-bold text-on-surface"
                  placeholder="Ej: Huerta San José / Mercado Abasto"
                  value={purchaseForm.proveedor}
                  onChange={e => setPurchaseForm({ ...purchaseForm, proveedor: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-secondary mb-1">Cantidad Comprada *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-2.5 text-sm outline-none focus:border-primary font-bold text-on-surface"
                    placeholder="Ej: 10"
                    value={purchaseForm.cantidad}
                    onChange={e => setPurchaseForm({ ...purchaseForm, cantidad: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">Precio TOTAL Pagado ($) *</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-amber-50 border border-amber-300 rounded-xl p-2.5 text-sm outline-none focus:border-primary font-bold text-amber-950"
                    placeholder="Ej: 15000"
                    value={purchaseForm.precioTotal}
                    onChange={e => setPurchaseForm({ ...purchaseForm, precioTotal: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Categoría de la Compra</label>
                <select
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-2.5 text-xs outline-none focus:border-primary font-bold text-on-surface"
                  value={purchaseForm.categoria}
                  onChange={e => setPurchaseForm({ ...purchaseForm, categoria: e.target.value })}
                >
                  <option value="📦 Mercadería (Stock)">📦 Mercadería (Stock - Suma al Inventario)</option>
                  <option value="🛍️ Insumos / Embalaje (Bolsas, Cinta, Film)">🛍️ Insumos / Embalaje (Bolsas, Cinta, Film)</option>
                  <option value="🛒 Gastos Extras">🛒 Gastos Extras</option>
                  <option value="💡 Servicios / Alquiler">💡 Servicios / Alquiler</option>
                </select>
              </div>
            </div>

            <div className="border-t pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPurchaseModal(false)}
                className="px-4 py-2 rounded-xl text-secondary hover:bg-surface-container-low text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
              >
                Guardar Compra
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Registrar Gasto / Servicio */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <form onSubmit={handleExpenseSubmit} className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-surface-container-highest flex flex-col gap-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-700">receipt_long</span>
                <span>Registrar Gasto o Servicio</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="text-secondary hover:text-on-surface font-bold text-base p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Concepto / Nombre del Gasto *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-2.5 text-sm outline-none focus:border-primary font-bold text-on-surface"
                  placeholder="Ej: Edesur - Luz del Local / Alquiler"
                  value={expenseForm.concepto}
                  onChange={e => setExpenseForm({ ...expenseForm, concepto: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Categoría</label>
                <select
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-2.5 text-xs outline-none focus:border-primary font-bold text-on-surface"
                  value={expenseForm.categoria}
                  onChange={e => setExpenseForm({ ...expenseForm, categoria: e.target.value })}
                >
                  <option value="Servicios">💡 Servicios (Luz, Agua, Gas, Internet)</option>
                  <option value="Alquiler">🏢 Alquiler</option>
                  <option value="Sueldos">👥 Sueldos / Personal</option>
                  <option value="Impuestos">🏛️ Impuestos / Tasas</option>
                  <option value="Mantenimiento">🔧 Mantenimiento / Reparaciones</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Monto Pagado ($) *</label>
                <input
                  type="number"
                  required
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-2.5 text-sm outline-none focus:border-primary font-bold text-on-surface"
                  placeholder="Ej: 8500"
                  value={expenseForm.monto}
                  onChange={e => setExpenseForm({ ...expenseForm, monto: e.target.value })}
                />
              </div>
            </div>

            <div className="border-t pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="px-4 py-2 rounded-xl text-secondary hover:bg-surface-container-low text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm"
              >
                Guardar Gasto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Movimiento Extra */}
      {showExtraModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <form onSubmit={handleExtraSubmit} className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-surface-container-highest flex flex-col gap-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-700">more_horiz</span>
                <span>Registrar Movimiento Extra</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowExtraModal(false)}
                className="text-secondary hover:text-on-surface font-bold text-base p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Tipo de Movimiento</label>
                <select
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-2.5 text-xs outline-none focus:border-primary font-bold text-on-surface"
                  value={extraForm.tipo}
                  onChange={e => setExtraForm({ ...extraForm, tipo: e.target.value })}
                >
                  <option value="ingreso">🟢 Ingreso Extra</option>
                  <option value="gasto">🔴 Gasto Extra</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Concepto / Descripción *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-2.5 text-sm outline-none focus:border-primary font-bold text-on-surface"
                  placeholder="Ej: Aporte inicial de caja / Venta de pallet usado"
                  value={extraForm.concepto}
                  onChange={e => setExtraForm({ ...extraForm, concepto: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Monto ($) *</label>
                <input
                  type="number"
                  required
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-2.5 text-sm outline-none focus:border-primary font-bold text-on-surface"
                  placeholder="Ej: 5000"
                  value={extraForm.monto}
                  onChange={e => setExtraForm({ ...extraForm, monto: e.target.value })}
                />
              </div>
            </div>

            <div className="border-t pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowExtraModal(false)}
                className="px-4 py-2 rounded-xl text-secondary hover:bg-surface-container-low text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm"
              >
                Guardar Movimiento
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
