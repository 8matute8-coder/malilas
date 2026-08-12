import { useState } from 'react';
import { useInventory } from './hooks/useInventory';
import { useOrders } from './hooks/useOrders';
import { useSales } from './hooks/useSales';
import { useAccounting } from './hooks/useAccounting';
import { useContacts } from './hooks/useContacts';
import { useActiveVisitors } from './hooks/useActiveVisitors';
import Inventory from './components/Inventory';
import Caja from './components/Caja';
import Delivery from './components/Delivery';
import Estadisticas from './components/Estadisticas';
import Contabilidad from './components/Contabilidad';
import Contactos from './components/Contactos';
import Login from './components/Login';
import './index.css';

function App() {
  const { activeCount } = useActiveVisitors(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('lamalila_auth_token') === 'logged_in_belen';
  });

  const [activeTab, setActiveTab] = useState('caja');
  const [showSettings, setShowSettings] = useState(false);
  const [aliasBancario, setAliasBancario] = useState(() => localStorage.getItem('lamalila_alias') || 'LAMALILA.MP');

  // Initialize shared state hooks
  const inventoryData = useInventory();
  const ordersData = useOrders();
  const salesData = useSales();
  const accountingData = useAccounting(inventoryData);
  const contactsData = useContacts();

  const pendingOrdersCount = ordersData.orders.filter(o => o.estado === 'pendiente').length;

  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('lamalila_alias', aliasBancario);
    setShowSettings(false);
    alert('Configuración guardada con éxito.');
  };

  const handleLogout = () => {
    if (window.confirm('¿Deseas cerrar la sesión administrativa?')) {
      localStorage.removeItem('lamalila_auth_token');
      setIsAuthenticated(false);
    }
  };

  // Si no está autenticado, mostrar la pantalla de login calcada del diseño
  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-background text-on-background font-sans pb-24 md:pb-8 flex flex-col">
      {/* Stitch TopAppBar Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-surface-container-highest shadow-xs px-4 md:px-8 h-16 md:h-20 flex justify-between items-center w-full">
        <div className="flex items-center gap-3">
          <img src="./logo.jpg" alt="La Malila Logo" className="h-10 md:h-12 w-auto object-contain rounded-full border border-primary/20 shadow-xs" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-primary tracking-tight">La Malila</h1>
            <p className="text-secondary text-xs hidden sm:block">Tu Almacén de Confianza</p>
          </div>
        </div>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex gap-6 items-center h-full">
          {[
            { id: 'caja', label: 'Caja', icon: 'shopping_cart' },
            { id: 'inventario', label: 'Inventario', icon: 'inventory_2' },
            { id: 'delivery', label: 'Delivery', icon: 'local_shipping', badge: pendingOrdersCount },
            { id: 'contabilidad', label: 'Control & Stats', icon: 'account_balance' },
            { id: 'contactos', label: 'Agenda', icon: 'contacts' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`h-full flex items-center gap-2 px-3.5 font-semibold text-sm border-b-2 transition-all relative cursor-pointer ${
                activeTab === tab.id || (tab.id === 'contabilidad' && activeTab === 'estadisticas')
                  ? 'border-primary text-primary font-bold bg-primary/5 rounded-t-xl'
                  : 'border-transparent text-secondary hover:text-primary hover:bg-surface-container-low hover:border-primary/40 rounded-t-xl'
              }`}
            >
              <span className="material-symbols-outlined">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className="bg-error text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Action Buttons: Webshop, Live Visitors, Settings & Logout */}
        <div className="flex items-center gap-2">
          {/* Live Visitor Presence Badge */}
          <div 
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-900 font-extrabold text-xs shadow-2xs" 
            title="Clientes navegando actualmente la tienda web en tiempo real"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>{activeCount} {activeCount === 1 ? 'cliente online' : 'clientes online'}</span>
          </div>

          <a
            href="./?tienda=1"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1 text-xs font-bold text-primary bg-primary-container/30 px-3 py-2 rounded-full hover:bg-primary-container/50 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">storefront</span>
            <span>Tienda Web</span>
          </a>

          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full text-secondary hover:bg-surface-container-low transition-colors"
            title="Configuración de Alias Mercado Pago"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>

          <button
            onClick={handleLogout}
            className="p-2 rounded-full text-error hover:bg-error-container/20 transition-colors"
            title="Cerrar Sesión"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4 shadow-xl">
            <h2 className="text-xl font-bold text-on-surface">Configuración del Local</h2>
            <div>
              <label className="block text-xs font-bold text-secondary mb-1">Alias Bancario / CBU</label>
              <input
                required
                className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary"
                value={aliasBancario}
                onChange={e => setAliasBancario(e.target.value)}
                placeholder="Ej: LAMALILA.MP"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" className="px-4 py-2 rounded-xl text-secondary hover:bg-surface-container-low text-sm font-semibold" onClick={() => setShowSettings(false)}>
                Cancelar
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-bold shadow-sm hover:bg-surface-tint">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 w-full p-4 md:p-8">
        <div className={activeTab === 'caja' ? 'block' : 'hidden'}>
          <Caja inventoryData={inventoryData} ordersData={ordersData} salesData={salesData} aliasBancario={aliasBancario} />
        </div>

        <div className={activeTab === 'inventario' ? 'block' : 'hidden'}>
          <Inventory inventoryData={inventoryData} accountingData={accountingData} />
        </div>

        <div className={activeTab === 'delivery' ? 'block' : 'hidden'}>
          <Delivery ordersData={ordersData} salesData={salesData} />
        </div>

        <div className={(activeTab === 'contabilidad' || activeTab === 'estadisticas') ? 'block' : 'hidden'}>
          <Contabilidad accountingData={accountingData} inventoryData={inventoryData} salesData={salesData} contactsData={contactsData} ordersData={ordersData} />
        </div>

        <div className={activeTab === 'contactos' ? 'block' : 'hidden'}>
          <Contactos contactsData={contactsData} />
        </div>
      </main>

      {/* Stitch Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-surface-container-highest grid grid-cols-5 items-center py-1.5 px-1 shadow-lg pb-safe">
        {[
          { id: 'caja', label: 'Caja', icon: 'shopping_cart' },
          { id: 'inventario', label: 'Stock', icon: 'inventory_2' },
          { id: 'delivery', label: 'Envío', icon: 'local_shipping', badge: pendingOrdersCount },
          { id: 'contabilidad', label: 'Control', icon: 'account_balance' },
          { id: 'contactos', label: 'Agenda', icon: 'contacts' }
        ].map((tab) => {
          const isActive = activeTab === tab.id || (tab.id === 'contabilidad' && activeTab === 'estadisticas');
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all relative w-full ${
                isActive
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-2xs'
                  : 'text-secondary hover:bg-surface-container-low'
              }`}
            >
              <div className="relative">
                <span className={`material-symbols-outlined text-[22px] ${isActive ? 'icon-fill' : ''}`}>
                  {tab.icon}
                </span>
                {tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-error text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tighter leading-none mt-0.5 truncate w-full text-center">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
