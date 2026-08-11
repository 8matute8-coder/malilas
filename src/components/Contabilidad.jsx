import React, { useState, useMemo } from 'react';
import { collection, doc, writeBatch, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Contabilidad({ accountingData, inventoryData, salesData, contactsData, ordersData }) {
  const { 
    purchases = [], expenses = [], extraMovements = [], 
    updatePurchaseCategory, deletePurchase, 
    recordExpense, toggleExpenseStatus, deleteExpense, 
    recordExtraMovement, deleteExtraMovement 
  } = accountingData || {};

  const { products = [] } = inventoryData || {};
  const { sales = [], deleteSale } = salesData || {};

  // Filter States for the Unified Excel Table
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('todos'); // 'todos', 'Venta', 'Gasto'
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [timeFilter, setTimeFilter] = useState('mes'); // 'hoy', 'semana', 'mes', 'todo'

  const [showStats, setShowStats] = useState(false);
  const [selectedTransactionDetail, setSelectedTransactionDetail] = useState(null);

  // Single Unified Expense Modal State ("Registrar Gasto")
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    tipoMovimiento: 'gasto', // 'gasto' | 'ingreso_extra'
    concepto: '', 
    categoria: 'Servicios (Luz, Agua, Gas, Internet)', 
    monto: '', 
    proveedor: ''
  });

  // Database Reset Modals State (Step 1 & Step 2)
  const [showResetModalStep1, setShowResetModalStep1] = useState(false);
  const [showResetModalStep2, setShowResetModalStep2] = useState(false);
  const [resetConfirmationInput, setResetConfirmationInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

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

    // 2. Purchases (Compras desde Inventario)
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

    // 3. Gastos (Expenses)
    (expenses || []).forEach(e => {
      const eDate = new Date(e.fecha);
      list.push({
        id: `expense-${e.id}`,
        originalId: e.id,
        rawDate: eDate,
        fechaFormatted: eDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        tipo: 'Gasto',
        tipoBadgeColor: 'bg-amber-100 text-amber-950 border-amber-300',
        tipoIcon: 'receipt_long',
        categoria: e.categoria || 'Servicios',
        proveedorCliente: e.proveedor ? `${e.concepto} (${e.proveedor})` : e.concepto,
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
        if (typeFilter === 'Gasto' && item.isIncome) return false;
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
  // METRICS & STATS CALCULATIONS
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

  // Top Selling Products Stats
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

  // Submit Unified Expense
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    const montoNum = parseFloat(expenseForm.monto) || 0;
    if (!expenseForm.concepto || montoNum <= 0) {
      alert('Por favor ingresa un concepto y monto válido.');
      return;
    }

    if (expenseForm.tipoMovimiento === 'ingreso_extra') {
      if (recordExtraMovement) {
        await recordExtraMovement({
          tipo: 'ingreso',
          concepto: expenseForm.concepto,
          monto: montoNum
        });
      }
    } else {
      if (recordExpense) {
        await recordExpense({
          concepto: expenseForm.concepto,
          categoria: expenseForm.categoria,
          monto: montoNum,
          proveedor: expenseForm.proveedor || '',
          estado: 'Pagado'
        });
      }
    }

    setExpenseForm({
      tipoMovimiento: 'gasto',
      concepto: '',
      categoria: 'Servicios (Luz, Agua, Gas, Internet)',
      monto: '',
      proveedor: ''
    });
    setShowExpenseModal(false);
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

  // -------------------------------------------------------------
  // REINICIAR BASE DE DATOS COMPLETA (DEJANDO MERCADERIAS CON STOCK EN 0)
  // -------------------------------------------------------------
  const handleExecuteDatabaseReset = async () => {
    if (resetConfirmationInput.trim().toUpperCase() !== 'REINICIAR') {
      alert('Por favor escribe la palabra "REINICIAR" para confirmar la operación.');
      return;
    }

    setIsResetting(true);
    try {
      // 1. Delete Sales
      if (sales && sales.length > 0) {
        const batchSales = writeBatch(db);
        sales.forEach(s => batchSales.delete(doc(db, 'sales', s.id)));
        await batchSales.commit();
      }

      // 2. Delete Purchases
      if (purchases && purchases.length > 0) {
        const batchPurchases = writeBatch(db);
        purchases.forEach(p => batchPurchases.delete(doc(db, 'purchases', p.id)));
        await batchPurchases.commit();
      }

      // 3. Delete Expenses
      if (expenses && expenses.length > 0) {
        const batchExpenses = writeBatch(db);
        expenses.forEach(e => batchExpenses.delete(doc(db, 'expenses', e.id)));
        await batchExpenses.commit();
      }

      // 4. Delete Extra Movements
      if (extraMovements && extraMovements.length > 0) {
        const batchExtras = writeBatch(db);
        extraMovements.forEach(m => batchExtras.delete(doc(db, 'extra_movements', m.id)));
        await batchExtras.commit();
      }

      // 5. Delete Orders
      if (ordersData?.orders && ordersData.orders.length > 0) {
        const batchOrders = writeBatch(db);
        ordersData.orders.forEach(o => batchOrders.delete(doc(db, 'orders', o.id)));
        await batchOrders.commit();
      }

      // 6. Reset all Inventory Products stock to 0
      if (products && products.length > 0) {
        for (const p of products) {
          if (inventoryData?.saveProduct) {
            await inventoryData.saveProduct({
              ...p,
              stockActual: 0
            });
          } else {
            await setDoc(doc(db, 'products', p.id), { ...p, stockActual: 0 });
          }
        }
      }

      alert('✅ Base de datos reiniciada con éxito. Toda la información fue borrada y los productos quedaron con stock en 0.');
      setShowResetModalStep2(false);
      setShowResetModalStep1(false);
      setResetConfirmationInput('');
    } catch (err) {
      console.error("Error reiniciando base de datos:", err);
      alert('Error al reiniciar la base de datos: ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full">
      {/* Header Dashboard & Action Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-surface-container-low shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-on-surface tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">account_balance</span>
            <span>Dashboard Contable & Control</span>
          </h2>
          <p className="text-xs text-secondary font-medium">Gestión unificada de ventas, gastos fijos, insumos y estadísticas del negocio</p>
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

          {/* UNIFIED GASTO BUTTON */}
          <button
            onClick={() => setShowExpenseModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">receipt_long</span>
            <span>+ Registrar Gasto</span>
          </button>

          {/* DATABASE RESET BUTTON */}
          <button
            onClick={() => setShowResetModalStep1(true)}
            className="bg-rose-50 hover:bg-rose-100 text-error border border-rose-200 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer ml-auto sm:ml-0"
            title="Reiniciar base de datos completa conservando productos con stock 0"
          >
            <span className="material-symbols-outlined text-base">delete_forever</span>
            <span>⚠️ Reiniciar Base de Datos</span>
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
            <span className="bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">Stock (en Inventario): ${formatPrice(statsSummary.comprasStock)}</span>
            <span className="bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">Gastos/Servicios: ${formatPrice(statsSummary.comprasInsumos + statsSummary.gastosFijos)}</span>
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

          <select
            className="bg-surface-container-low border border-surface-container-highest rounded-xl px-3 py-2.5 text-xs font-bold text-on-surface outline-none focus:border-primary cursor-pointer"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="todos">🏷️ Todos los Tipos</option>
            <option value="Venta">🟢 Solo Ventas</option>
            <option value="Compra">🔴 Solo Compras</option>
            <option value="Gasto">📙 Solo Gastos</option>
          </select>

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

          <button
            onClick={exportToCSV}
            className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 px-3.5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
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

      {/* UNIFIED GASTO / SERVICIO / EXTRA MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <form onSubmit={handleExpenseSubmit} className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-surface-container-highest flex flex-col gap-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-700">receipt_long</span>
                <span>Registrar Gasto o Movimiento</span>
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
                <label className="block text-xs font-bold text-secondary mb-1">Tipo de Movimiento</label>
                <select
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-2.5 text-xs outline-none focus:border-primary font-bold text-on-surface"
                  value={expenseForm.tipoMovimiento}
                  onChange={e => setExpenseForm({ ...expenseForm, tipoMovimiento: e.target.value })}
                >
                  <option value="gasto">🔴 Registrar Gasto / Egreso de Dinero</option>
                  <option value="ingreso_extra">🟢 Registrar Ingreso Extra</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Concepto / Nombre del Gasto *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-2.5 text-sm outline-none focus:border-primary font-bold text-on-surface"
                  placeholder="Ej: Edesur Luz / Bolsas de Plástico / Alquiler"
                  value={expenseForm.concepto}
                  onChange={e => setExpenseForm({ ...expenseForm, concepto: e.target.value })}
                />
              </div>

              {expenseForm.tipoMovimiento === 'gasto' && (
                <div>
                  <label className="block text-xs font-bold text-secondary mb-1">Categoría del Gasto</label>
                  <select
                    className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-2.5 text-xs outline-none focus:border-primary font-bold text-on-surface"
                    value={expenseForm.categoria}
                    onChange={e => setExpenseForm({ ...expenseForm, categoria: e.target.value })}
                  >
                    <option value="Servicios (Luz, Agua, Gas, Internet)">💡 Servicios (Luz, Agua, Gas, Internet)</option>
                    <option value="Alquiler">🏢 Alquiler</option>
                    <option value="Sueldos / Personal">👥 Sueldos / Personal</option>
                    <option value="Insumos / Embalaje (Bolsas, Cinta, Film)">🛍️ Insumos / Embalaje (Bolsas, Cinta, Film)</option>
                    <option value="Gastos Varios / Extras">🛒 Gastos Varios / Extras</option>
                    <option value="Impuestos / Tasas">🏛️ Impuestos / Tasas</option>
                    <option value="Mantenimiento / Reparaciones">🔧 Mantenimiento / Reparaciones</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Proveedor / Entidad (Opcional)</label>
                <input
                  type="text"
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-2.5 text-sm outline-none focus:border-primary font-bold text-on-surface"
                  placeholder="Ej: Edesur / Distribuidora X"
                  value={expenseForm.proveedor}
                  onChange={e => setExpenseForm({ ...expenseForm, proveedor: e.target.value })}
                />
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
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Guardar Gasto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DATABASE RESET MODAL STEP 1 (Paso 1: Advertencia Inicial) */}
      {showResetModalStep1 && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border-4 border-amber-500 flex flex-col gap-4">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <span className="text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-md">
                  PASO 1 DE 2
                </span>
                <h3 className="text-xl font-black text-amber-950 mt-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-2xl">warning</span>
                  <span>¿Reiniciar Base de Datos Completa?</span>
                </h3>
              </div>
              <button onClick={() => setShowResetModalStep1(false)} className="text-secondary font-bold p-1">✕</button>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-950 text-xs font-semibold space-y-2">
              <p className="font-bold text-sm text-amber-900">⚠️ ADVERTENCIA DE BORRADO DE DATOS:</p>
              <p>Al confirmar este proceso, se eliminarán **PERMANENTEMENTE**:</p>
              <ul className="list-disc list-inside space-y-1 font-bold">
                <li>Todo el historial de Ventas y Tickets de Caja</li>
                <li>Todas las Compras registradas</li>
                <li>Todos los Gastos y Movimientos Extras</li>
                <li>Todos los Pedidos de Delivery</li>
              </ul>
              <p className="pt-1 text-emerald-900 font-extrabold">
                📌 **Los Productos en Inventario NO se borrarán**, pero el stock actual de CADA uno se pondrá automáticamente en **0 (CERO)**.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModalStep1(false)}
                className="px-4 py-2.5 rounded-xl border border-surface-container-highest text-secondary font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetModalStep1(false);
                  setShowResetModalStep2(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md"
              >
                Entendido, ir al Paso 2 ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DATABASE RESET MODAL STEP 2 (Paso 2: Advertencia Final y Confirmacion con Escribir) */}
      {showResetModalStep2 && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border-4 border-rose-600 flex flex-col gap-4">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <span className="text-xs font-black bg-rose-100 text-rose-900 border border-rose-300 px-2.5 py-0.5 rounded-md">
                  PASO 2 DE 2 (CONFIRMACIÓN FINAL)
                </span>
                <h3 className="text-xl font-black text-rose-950 mt-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-600 text-2xl">dangerous</span>
                  <span>🚨 ADVERTENCIA FINAL: Confirmar borrado</span>
                </h3>
              </div>
              <button onClick={() => setShowResetModalStep2(false)} className="text-secondary font-bold p-1">✕</button>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-950 text-xs font-semibold space-y-2">
              <p className="font-bold text-sm text-rose-900">🚨 ESTA ACCIÓN NO SE PUEDE DESHACER.</p>
              <p>Escribe la palabra <strong className="text-rose-700 uppercase underline font-black">REINICIAR</strong> en el cuadro inferior para habilitar la eliminación completa.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Escribe "REINICIAR" para confirmar *</label>
              <input
                type="text"
                className="w-full bg-surface-container-low border border-rose-300 rounded-xl p-3 text-sm font-black uppercase text-rose-900 outline-none focus:border-rose-600"
                placeholder="REINICIAR"
                value={resetConfirmationInput}
                onChange={e => setResetConfirmationInput(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowResetModalStep2(false);
                  setResetConfirmationInput('');
                }}
                className="px-4 py-2.5 rounded-xl border border-surface-container-highest text-secondary font-bold text-xs"
              >
                Cancelar y Salvar Datos
              </button>
              <button
                type="button"
                disabled={resetConfirmationInput.trim().toUpperCase() !== 'REINICIAR' || isResetting}
                onClick={handleExecuteDatabaseReset}
                className={`px-5 py-2.5 rounded-xl font-black text-xs shadow-md transition-all flex items-center gap-1.5 ${
                  resetConfirmationInput.trim().toUpperCase() === 'REINICIAR' && !isResetting
                    ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer active:scale-95'
                    : 'bg-surface-container-high text-secondary cursor-not-allowed opacity-50'
                }`}
              >
                <span className="material-symbols-outlined text-base">delete_forever</span>
                <span>{isResetting ? 'Borrando...' : '💣 BORRAR TODO Y PONER STOCK EN 0'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
