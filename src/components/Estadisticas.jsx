import React, { useMemo, useState } from 'react';

export default function Estadisticas({ salesData, ordersData }) {
  const { sales, clearHistory, deleteSale } = salesData;
  const { restoreOrder } = ordersData || {};
  const [timeFilter, setTimeFilter] = useState('global'); // 'hoy', 'semana', 'mes', 'global'
  const [expandedSale, setExpandedSale] = useState(null);

  const formatPrice = (num) => Math.round(Number(num)).toLocaleString('es-AR');

  const filteredSales = useMemo(() => {
    const now = new Date();
    
    return sales.filter(sale => {
      if (timeFilter === 'global') return true;
      
      const saleDate = new Date(sale.fecha);
      if (timeFilter === 'hoy') {
        return saleDate.toDateString() === now.toDateString();
      }
      if (timeFilter === 'semana') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        return saleDate >= startOfWeek;
      }
      if (timeFilter === 'mes') {
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [sales, timeFilter]);

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalLocal = 0;
    let totalDelivery = 0;
    const productCounts = {};

    filteredSales.forEach(sale => {
      totalRevenue += sale.total;
      if (sale.type === 'Local' || sale.type === 'Venta Rápida') totalLocal++;
      if (sale.type === 'Delivery') totalDelivery++;

      const isCalculatorSale = 
        sale.type === 'Venta Rápida' ||
        sale.originalOrder === 'Mostrador (Calculadora)' ||
        sale.cliente === 'Mostrador (Calculadora)';

      // Solo procesar productos individuales si NO es una venta manual por calculadora
      if (!isCalculatorSale && sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          if (!item.product || !item.product.nombre) return;
          const pName = item.product.nombre;
          
          // Omitir items comodin de calculadora
          if (pName.startsWith('Item ') || pName.startsWith('Monto ') || item.isCalculator) return;

          let itemQty = parseFloat(item.quantity) || 0;
          let mult = item.product.tipoVenta === 'grs' ? (itemQty / 100) : itemQty;

          const itemCost = mult * (item.product.costoPromedio || 0);
          totalCost += itemCost;

          if (!productCounts[pName]) {
            productCounts[pName] = {
              quantity: 0,
              revenue: 0,
              cost: 0,
              tipoVenta: item.product.tipoVenta || 'unidad'
            };
          }
          productCounts[pName].quantity += itemQty;
          productCounts[pName].revenue += (mult * (item.product.precioVenta || 0));
          productCounts[pName].cost += itemCost;
        });
      }
    });

    const totalProfit = totalRevenue - totalCost;
    const marginPercent = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';
    const markupPercent = totalCost > 0 ? ((totalProfit / totalCost) * 100).toFixed(1) : '0';

    const topProducts = Object.entries(productCounts)
      .map(([name, data]) => {
        const profit = data.revenue - data.cost;
        const markupPercent = data.cost > 0 ? Math.round((profit / data.cost) * 100) : 0;
        return { 
          name, 
          ...data,
          profit,
          markupPercent
        };
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return { totalRevenue, totalProfit, totalLocal, totalDelivery, marginPercent, markupPercent, topProducts };
  }, [filteredSales]);

  const sortedSales = [...filteredSales].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-on-surface">Estadísticas</h2>
        {sales.length > 0 && (
          <button 
            onClick={clearHistory}
            className="bg-error-container/40 text-on-error-container hover:bg-error-container/60 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-base">delete</span>
            <span>Borrar Historial</span>
          </button>
        )}
      </div>

      {/* Selector de Filtros estilo Stitch */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'hoy', label: 'Hoy' },
          { id: 'semana', label: 'Semana' },
          { id: 'mes', label: 'Mes' },
          { id: 'global', label: 'Global' }
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => setTimeFilter(filter.id)}
            className={`px-5 py-2 rounded-full font-bold text-sm transition-all ${
              timeFilter === filter.id
                ? 'bg-primary-container text-on-primary-container shadow-xs'
                : 'bg-white border border-surface-container-highest text-secondary hover:bg-surface-container-low'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-surface-container-low border-t-4 border-t-blue-600 flex flex-col items-center text-center">
          <span className="material-symbols-outlined text-blue-600 text-3xl mb-1">trending_up</span>
          <p className="text-xs font-bold text-secondary uppercase tracking-wider">Recaudación Total</p>
          <h3 className="text-2xl font-bold text-on-surface mt-1">${formatPrice(stats.totalRevenue)}</h3>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-surface-container-low border-t-4 border-t-primary flex flex-col items-center text-center">
          <span className="material-symbols-outlined text-primary text-3xl mb-1">attach_money</span>
          <p className="text-xs font-bold text-secondary uppercase tracking-wider">Ganancia Neta</p>
          <h3 className="text-2xl font-bold text-primary mt-1">${formatPrice(stats.totalProfit)}</h3>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-surface-container-low border-t-4 border-t-emerald-600 flex flex-col items-center text-center col-span-2 sm:col-span-1">
          <span className="material-symbols-outlined text-emerald-600 text-3xl mb-1">percent</span>
          <p className="text-xs font-bold text-secondary uppercase tracking-wider">% Ganancia Prom.</p>
          <h3 className="text-2xl font-bold text-emerald-700 mt-1">+{stats.markupPercent}%</h3>
          <span className="text-[10px] text-secondary font-medium">({stats.marginPercent}% Margen s/ venta)</span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-surface-container-low flex flex-col items-center text-center">
          <span className="material-symbols-outlined text-secondary text-3xl mb-1">storefront</span>
          <p className="text-xs font-bold text-secondary uppercase tracking-wider">Ventas Mostrador</p>
          <h3 className="text-2xl font-bold text-on-surface mt-1">{stats.totalLocal}</h3>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-surface-container-low flex flex-col items-center text-center">
          <span className="material-symbols-outlined text-secondary text-3xl mb-1">local_shipping</span>
          <p className="text-xs font-bold text-secondary uppercase tracking-wider">Deliveries</p>
          <h3 className="text-2xl font-bold text-on-surface mt-1">{stats.totalDelivery}</h3>
        </div>
      </div>

      {/* Top 5 Products */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-surface-container-low flex flex-col gap-4">
        <h3 className="text-xl font-bold text-on-surface border-b border-surface-container-highest pb-3">
          Top 5 Productos Más Vendidos
        </h3>

        {stats.topProducts.length === 0 ? (
          <p className="text-secondary text-center py-6">No hay ventas registradas en este período.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {stats.topProducts.map((p, index) => (
              <div key={index} className="bg-surface-container-low p-4 rounded-xl flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className="font-bold text-base text-on-surface flex items-center gap-2">
                    <span className="bg-primary text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
                      #{index + 1}
                    </span>
                    <span>{p.name}</span>
                  </div>
                  <span className="bg-white px-3 py-1 rounded-full font-bold text-xs border border-surface-container-highest">
                    {p.quantity} {p.tipoVenta === 'unidad' ? 'un' : 'kg'}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs pt-2 border-t border-surface-container-highest">
                  <div>
                    <span className="block text-secondary">Costo Total</span>
                    <span className="font-bold text-error">${formatPrice(p.cost)}</span>
                  </div>
                  <div>
                    <span className="block text-secondary">Ventas</span>
                    <span className="font-bold text-on-surface">${formatPrice(p.revenue)}</span>
                  </div>
                  <div>
                    <span className="block text-secondary">Ganancia $</span>
                    <span className="font-bold text-primary">${formatPrice(p.profit)}</span>
                  </div>
                  <div>
                    <span className="block text-secondary">% Ganancia</span>
                    <span className="font-bold text-emerald-700">+{p.markupPercent}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-surface-container-low flex flex-col gap-4">
        <h3 className="text-xl font-bold text-on-surface border-b border-surface-container-highest pb-3">
          Historial Cronológico
        </h3>

        {sortedSales.length === 0 ? (
          <p className="text-secondary text-center py-6">Aún no hay ventas registradas.</p>
        ) : (
          <div className="divide-y divide-surface-container-highest">
            {sortedSales.map((sale) => {
              const d = new Date(sale.fecha);
              const isExpanded = expandedSale === sale.id;

              return (
                <div key={sale.id} className="py-3">
                  <div 
                    className="flex justify-between items-center cursor-pointer p-2 rounded-xl hover:bg-surface-container-low transition-colors"
                    onClick={() => setExpandedSale(isExpanded ? null : sale.id)}
                  >
                    <div>
                      <div className="font-bold text-sm text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-base">
                          {sale.type === 'Delivery' ? 'local_shipping' : 'shopping_bag'}
                        </span>
                        <span>{sale.cliente}</span>
                      </div>
                      <div className="text-xs text-secondary mt-0.5">
                        {d.toLocaleDateString('es-AR')} • {d.toLocaleTimeString('es-AR', { hour: '2-digit', minute:'2-digit' })}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <div className="font-bold text-base text-primary">${formatPrice(sale.total)}</div>
                        <div className="text-xs text-secondary">{sale.items.length} items</div>
                      </div>
                      <span className="material-symbols-outlined text-secondary">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 bg-surface-container-low p-4 rounded-xl flex flex-col gap-3 text-xs">
                      <div className="font-bold text-on-surface">Detalle del Pedido:</div>
                      <ul className="flex flex-col gap-1.5">
                        {sale.items.map((item, i) => (
                          <li key={i} className="flex justify-between border-b border-surface-container-highest pb-1">
                            <span>{item.quantity} {item.product.tipoVenta === 'unidad' ? 'un' : 'kg'} - {item.product.nombre}</span>
                            <span className="font-semibold">${formatPrice(item.quantity * item.product.precioVenta)}</span>
                          </li>
                        ))}
                      </ul>

                      {sale.type === 'Delivery' && sale.originalOrder && restoreOrder && (
                        <button 
                          className="mt-2 w-full bg-amber-100 text-amber-900 font-bold py-2 rounded-xl text-xs hover:bg-amber-200 transition-colors flex items-center justify-center gap-1"
                          onClick={() => {
                            if(window.confirm('¿Deshacer la entrega y devolver este pedido a la lista de envíos en camino?')) {
                              restoreOrder(sale.originalOrder);
                              deleteSale(sale.id);
                            }
                          }}
                        >
                          <span className="material-symbols-outlined text-sm">undo</span>
                          <span>Deshacer Entrega y volver a Envíos</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
