const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  size: 'A4',
  margin: 40
});

const outputPath = path.join(__dirname, 'Manual_de_Usuario_La_Malila.pdf');
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Colors
const PRIMARY = '#497d26';
const SECONDARY = '#44483d';
const DARK = '#1c1b1f';
const LIGHT_BG = '#f4f7ee';
const BORDER_COLOR = '#dce5d0';

// Header Title
doc.rect(40, 40, 515, 65).fill(PRIMARY);
doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('MANUAL DE USUARIO OFICIAL', 55, 52);
doc.fontSize(12).font('Helvetica').text('Verdulería & Frutería "La Malila" - Sistema de Gestión & Tienda Web', 55, 80);

doc.moveDown(2);

// Intro Box
doc.rect(40, 120, 515, 50).fillAndStroke(LIGHT_BG, BORDER_COLOR);
doc.fillColor(DARK).fontSize(10).font('Helvetica')
   .text('Este documento contiene la guía completa de funciones del Sistema Administrativo y de la Tienda Web de Clientes. Diseñado para optimizar las ventas, el control de stock, compras y envíos.', 50, 130, { width: 495, align: 'left' });

doc.moveDown(3);

function addSectionHeader(title, y) {
  doc.rect(40, y, 515, 24).fill(LIGHT_BG);
  doc.rect(40, y, 4, 24).fill(PRIMARY);
  doc.fillColor(PRIMARY).fontSize(11).font('Helvetica-Bold').text(title, 52, y + 6);
}

let currentY = 190;

// Section 1
addSectionHeader('1. ACCESO Y SEGURIDAD (LOGIN DE BELÉN)', currentY);
currentY += 32;

doc.fillColor(DARK).fontSize(9.5).font('Helvetica')
   .text('• Pantalla de Ingreso: Al ingresar al sistema administrativo se requiere autenticación.', 50, currentY)
   .text('• Contraseña de Acceso: malila2026', 50, currentY + 14, { font: 'Helvetica-Bold' })
   .text('• Encriptación SHA-256: La contraseña se verifica con hashing SHA-256. Ninguna clave plana existe en el código.', 50, currentY + 28)
   .text('• Sesión Persistente: La sesión permanece abierta indefinidamente en tu dispositivo para mayor comodidad.', 50, currentY + 42)
   .text('• Cerrar Sesión: Botón de logout en la cabecera superior para bloquear el acceso en cualquier momento.', 50, currentY + 56);

currentY += 75;

// Section 2
addSectionHeader('2. CAJA REGISTRADORA Y VENTAS EN MOSTRADOR', currentY);
currentY += 32;

doc.fillColor(DARK).fontSize(9.5).font('Helvetica')
   .text('• Ventas Rápidas: Selección de productos y cálculo automático por Kilo (kg), Gramos (grs) o Unidad (un).', 50, currentY)
   .text('• Descuento por Ofertas: Aplicación automática de tarifas de oferta (ej. 2 kg de mandarinas a $2000).', 50, currentY + 14)
   .text('• Formas de Pago: Registro de cobros en Efectivo o Transferencia / Mercado Pago (Alias: LAMALILA.MP).', 50, currentY + 28)
   .text('• Ocultamiento de Stock 0: Los productos sin stock desaparecen de la caja y tienda web automáticamente.', 50, currentY + 42);

currentY += 65;

// Section 3
addSectionHeader('3. INVENTARIO, PRECIOS Y MERMAS', currentY);
currentY += 32;

doc.fillColor(DARK).fontSize(9.5).font('Helvetica')
   .text('• Alta de Productos: Creación de mercadería con imagen, costo, precio de venta y % de ganancia (markup).', 50, currentY)
   .text('• Potencial de Venta: Tarjetas métricas con Inversión Total en Stock, Valuación y Ganancia Bruta Esperada.', 50, currentY + 14)
   .text('• Registro de Mermas: Descuento de fruta/verdura dañada indicando cantidad y motivo.', 50, currentY + 28)
   .text('• Historial de Mermas: Reporte de dinero perdido en costo con opción para eliminar registros o vaciar todo.', 50, currentY + 42);

currentY += 65;

// Section 4: Egg Auto Sync
addSectionHeader('4. SINCRONIZACIÓN AUTOMÁTICA DE MAPLES DE HUEVO', currentY);
currentY += 32;

doc.fillColor(DARK).fontSize(9.5).font('Helvetica')
   .text('• Regla de Sincronización: Al ingresar stock de Maples (ej. Maple 30 Huevos), el sistema incrementa +30 unidades en la ficha de Huevo Blanco (Unidad) automáticamente.', 50, currentY, { width: 495 })
   .text('• Recálculo de Costo Promedio: Ajusta dinámicamente el costo ponderado por huevo individual (Costo Maple / 30).', 50, currentY + 25);

currentY += 50;

// Page 2
doc.addPage();

// Page 2 Header
doc.rect(40, 40, 515, 40).fill(PRIMARY);
doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text('MANUAL DE USUARIO - PARTE 2', 55, 52);

currentY = 95;

// Section 5
addSectionHeader('5. PANEL DE CONTROL CONTABLE (COMPRAS, PAGOS Y EXTRAS)', currentY);
currentY += 32;

doc.fillColor(DARK).fontSize(9.5).font('Helvetica')
   .text('• Dashboard Contable: Balance General en tiempo real (Ingresos Totales - Egresos Totales).', 50, currentY)
   .text('• Compras a Proveedores: Registro de mercadería comprada con incremento automático de stock en inventario.', 50, currentY + 14)
   .text('• Alta de Productos en Compra: Opción "+ Crear y Sumar NUEVO Producto" directamente desde la planilla de compras.', 50, currentY + 28)
   .text('• Pagos (Gastos Fijos): Control de Alquiler, Servicios, Sueldos e Impuestos con estados Pagado vs Pendiente.', 50, currentY + 42)
   .text('• Movimientos Extras: Registro de ingresos extras (ej. venta de pallets) y gastos extras (ej. reparación balanza).', 50, currentY + 56);

currentY += 75;

// Section 6
addSectionHeader('6. GESTIÓN DE ENVÍOS Y TIENDA WEB CLIENTES (/tienda)', currentY);
currentY += 32;

doc.fillColor(DARK).fontSize(9.5).font('Helvetica')
   .text('• Tienda Web Clientes: Catálogo público directo donde clientes pueden pedir desde su celular sin fricción.', 50, currentY)
   .text('• Contacto & Ubicación: Enlace interactivo a Google Maps (25 de Mayo y Chile) y WhatsApp directo (3814751814).', 50, currentY + 14)
   .text('• Módulo Delivery: Recepción de pedidos web en vivo con estados (Pendiente -> En Camino -> Entregado).', 50, currentY + 28)
   .text('• Impacto en Caja: Al marcar un pedido como Entregado, cobra automáticamente el dinero en el balance del día.', 50, currentY + 42);

currentY += 65;

// Section 7
addSectionHeader('7. AGENDA DE CONTACTOS (CLIENTES Y PROVEEDORES)', currentY);
currentY += 32;

doc.fillColor(DARK).fontSize(9.5).font('Helvetica')
   .text('• Catálogo de Clientes: Registro de direcciones de entrega, teléfono y notas particulares de entrega.', 50, currentY)
   .text('• Catálogo de Proveedores: Registro de empresas, contactos, rubro de mercadería y número de puesto.', 50, currentY + 14)
   .text('• WhatsApp 1-Click: Botón directo para chatear por WhatsApp sin agendar el número en el celular.', 50, currentY + 28)
   .text('• Google Maps 1-Click: Enlace directo para abrir la ubicación exacta de entrega o puesto en el mapa de Tucumán.', 50, currentY + 42);

currentY += 65;

// Section 8
addSectionHeader('8. ESTADÍSTICAS Y MÉTRICAS DE NEGOCIO', currentY);
currentY += 32;

doc.fillColor(DARK).fontSize(9.5).font('Helvetica')
   .text('• Reportes de Ventas: Gráficos por día, semana y mes.', 50, currentY)
   .text('• Margen de Ganancia: Porcentaje de ganancia bruta global sobre las ventas realizadas.', 50, currentY + 14)
   .text('• Productos más Vendidos: Ranking dinámico de frutas, verduras y huevos más solicitados.', 50, currentY + 28)
   .text('• Comparativa: Ventas en Mostrador vs Envíos por Delivery.', 50, currentY + 42);

// Footer
doc.fillColor(SECONDARY).fontSize(8).font('Helvetica-Oblique')
   .text('Documento generado automáticamente para Verdulería & Frutería "La Malila" - San Miguel de Tucumán', 40, 780, { align: 'center', width: 515 });

doc.end();

console.log('PDF generado exitosamente en:', outputPath);
