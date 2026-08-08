import React from 'react';

export default function Delivery({ ordersData, salesData }) {
  const { orders, updateOrderStatus, deleteOrder } = ordersData;
  const { recordSale } = salesData || {};
  const aliasBancario = localStorage.getItem('lamalila_alias') || "LAMALILA.MP";

  const formatPrice = (num) => Math.round(Number(num)).toLocaleString('es-AR');

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pendiente':
        return <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">Pendiente</span>;
      case 'armado':
        return <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-xs">Armado</span>;
      case 'enviado':
        return <span className="px-3 py-1 rounded-full bg-primary-container/30 text-primary font-bold text-xs">En Camino</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-surface-container-low text-secondary font-bold text-xs">{status}</span>;
    }
  };

  const enviarWhatsAppCobro = (order) => {
    if (!order.telefono) {
      alert("No hay teléfono registrado para este pedido.");
      return;
    }
    
    let itemsText = order.items.map(i => `- ${i.quantity} ${i.product.tipoVenta === 'unidad' ? 'un.' : 'kg.'} ${i.product.nombre}`).join('\n');
    let totalStr = formatPrice(order.total);
    
    let msg = `Hola ${order.cliente}!\nTu pedido de *La Malila* ya está armado.\n\n*Detalle:*\n${itemsText}\n\n*Total a pagar: $${totalStr}*\n\nPuedes transferir a nuestro Alias: *${aliasBancario}*\nPor favor, envíanos el comprobante por aquí para despacharlo. ¡Gracias!`;
    
    window.open(`https://wa.me/${order.telefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const enviarWhatsAppEnCamino = (order) => {
    if (!order.telefono) return;
    let msg = `Hola ${order.cliente}!\nTe avisamos que tu pedido de *La Malila* ya está en camino a ${order.direccion}.\n¡Muchas gracias por tu compra!`;
    window.open(`https://wa.me/${order.telefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handlePrint = (order) => {
    const printContent = `
      <div style="font-family: monospace; width: 300px; margin: 0 auto; text-align: center; border: 1px solid black; padding: 10px;">
        <h2>La Malila</h2>
        <h1>${order.displayId}</h1>
        <p><strong>Cliente:</strong> ${order.cliente}</p>
        <p><strong>Dirección:</strong> ${order.direccion}</p>
        <hr/>
        <ul style="list-style: none; padding: 0; text-align: left;">
          ${order.items.map(i => `<li>${i.quantity} ${i.product.tipoVenta === 'unidad' ? 'un' : 'kg'} - ${i.product.nombre}</li>`).join('')}
        </ul>
        <hr/>
        <h3>Total: $${formatPrice(order.total)}</h3>
      </div>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePrintAll = () => {
    const sortedOrders = [...orders].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    
    let htmlContent = `
      <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1 style="text-align: center;">Resumen de Pedidos - La Malila</h1>
        <p style="text-align: center; color: #555;">Impreso el ${new Date().toLocaleString('es-AR')}</p>
        <hr/>
    `;

    sortedOrders.forEach(order => {
      htmlContent += `
        <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
            <div>
              <strong style="font-size: 1.2em;">${order.cliente}</strong><br/>
              <span style="color: #666;">${order.direccion} - Tel: ${order.telefono}</span>
            </div>
            <div style="text-align: right;">
              <strong>${order.displayId}</strong><br/>
            </div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse;">
            ${order.items.map(i => `
              <tr>
                <td style="padding: 4px 0;">${i.quantity} ${i.product.tipoVenta === 'unidad' ? 'un' : 'kg'} - ${i.product.nombre}</td>
                <td style="text-align: right; padding: 4px 0;">$${formatPrice(i.product.precioVenta * i.quantity)}</td>
              </tr>
            `).join('')}
          </table>
          
          <div style="text-align: right; margin-top: 10px; font-size: 1.1em; border-top: 1px solid #eee; padding-top: 10px;">
            <strong>Total: $${formatPrice(order.total)}</strong>
          </div>
        </div>
      `;
    });

    htmlContent += `</div>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-on-surface">Pedidos (Delivery)</h2>
        {orders.length > 0 && (
          <button 
            onClick={handlePrintAll} 
            className="bg-white border border-surface-container-highest px-4 py-2 rounded-xl text-secondary font-bold text-sm hover:bg-surface-container-low flex items-center gap-2 shadow-xs"
          >
            <span className="material-symbols-outlined text-base">print</span>
            <span>Imprimir Todo</span>
          </button>
        )}
      </div>
      
      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-secondary border border-dashed border-surface-container-highest">
          No hay pedidos de Delivery pendientes. ¡Aparecerán aquí cuando los clientes compren en la tienda web!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {orders.map(order => (
            <div 
              key={order.id} 
              className="bg-white rounded-2xl p-5 shadow-sm border border-surface-container-low flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div>
                    <h3 className="font-bold text-lg text-on-surface">{order.cliente}</h3>
                    <p className="text-xs text-secondary">{order.direccion} {order.telefono ? `• Tel: ${order.telefono}` : ''}</p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(order.estado)}
                    <div className="font-mono text-xs text-secondary mt-1 font-bold">{order.displayId}</div>
                  </div>
                </div>

                {/* Items List */}
                <div className="bg-surface-container-low p-3 rounded-xl max-h-36 overflow-y-auto text-sm divide-y divide-surface-container-highest">
                  {order.items.map(i => (
                    <div key={i.product.id} className="flex justify-between py-1 text-xs">
                      <span>{i.quantity}x {i.product.nombre}</span>
                      <span className="font-semibold">${formatPrice(i.product.precioVenta * i.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total & Action Buttons */}
              <div className="flex flex-col gap-3 pt-2 border-t border-surface-container-highest">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">${formatPrice(order.total)}</span>
                </div>

                {/* Pipeline Status Buttons */}
                <div className="flex gap-2">
                  {order.estado === 'pendiente' && (
                    <button 
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-3 rounded-xl text-sm flex items-center justify-center gap-1 shadow-xs" 
                      onClick={() => updateOrderStatus(order.id, 'armado')}
                    >
                      <span className="material-symbols-outlined text-base">inventory_2</span>
                      <span>Marcar Armado</span>
                    </button>
                  )}
                  {order.estado === 'armado' && (
                    <button 
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-sm flex items-center justify-center gap-1 shadow-xs" 
                      onClick={() => updateOrderStatus(order.id, 'enviado')}
                    >
                      <span className="material-symbols-outlined text-base">local_shipping</span>
                      <span>Marcar Enviado</span>
                    </button>
                  )}
                  {order.estado === 'enviado' && (
                    <button 
                      className="flex-1 bg-primary hover:bg-surface-tint text-white font-bold py-2 px-3 rounded-xl text-sm flex items-center justify-center gap-1 shadow-xs" 
                      onClick={() => {
                        if(window.confirm('¿Confirmas que el pedido fue entregado? Se registrará en Estadísticas.')) {
                          if (recordSale) recordSale(order.items, order.total, 'Delivery', order.cliente, order);
                          deleteOrder(order.id);
                        }
                      }}
                    >
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      <span>Entregado</span>
                    </button>
                  )}

                  <button 
                    className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container-highest text-secondary"
                    onClick={() => handlePrint(order)} 
                    title="Imprimir Etiqueta"
                  >
                    <span className="material-symbols-outlined text-base">print</span>
                  </button>
                </div>

                {/* WhatsApp & Trash Actions */}
                <div className="flex gap-2 text-xs">
                  <button 
                    className="flex-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-semibold py-1.5 px-2 rounded-xl flex items-center justify-center gap-1"
                    onClick={() => enviarWhatsAppCobro(order)}
                  >
                    <span className="material-symbols-outlined text-sm">chat</span>
                    <span>Wsp Cobro</span>
                  </button>
                  <button 
                    className="flex-1 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-semibold py-1.5 px-2 rounded-xl flex items-center justify-center gap-1"
                    onClick={() => enviarWhatsAppEnCamino(order)}
                  >
                    <span className="material-symbols-outlined text-sm">near_me</span>
                    <span>Wsp Camino</span>
                  </button>
                  <button 
                    className="p-1.5 text-error hover:bg-error-container/30 rounded-xl"
                    onClick={() => { if(window.confirm('¿Eliminar pedido?')) deleteOrder(order.id); }}
                    title="Eliminar"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
