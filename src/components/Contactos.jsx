import React, { useState } from 'react';

export default function Contactos({ contactsData }) {
  const { clients, suppliers, saveClient, deleteClient, saveSupplier, deleteSupplier } = contactsData;

  const [activeTab, setActiveTab] = useState('clients'); // 'clients' o 'suppliers'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [clientForm, setClientForm] = useState({
    id: '', nombre: '', telefono: '', direccion: '', notas: ''
  });

  const [supplierForm, setSupplierForm] = useState({
    id: '', nombre: '', contacto: '', telefono: '', rubro: '', direccion: '', notas: ''
  });

  const filteredClients = clients.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefono.includes(searchTerm) ||
    c.direccion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(s => 
    s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contacto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.rubro.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenNew = () => {
    setEditingItem(null);
    if (activeTab === 'clients') {
      setClientForm({ id: '', nombre: '', telefono: '', direccion: '', notas: '' });
    } else {
      setSupplierForm({ id: '', nombre: '', contacto: '', telefono: '', rubro: '', direccion: '', notas: '' });
    }
    setShowModal(true);
  };

  const handleEditClient = (cli) => {
    setEditingItem(cli);
    setClientForm(cli);
    setShowModal(true);
  };

  const handleEditSupplier = (sup) => {
    setEditingItem(sup);
    setSupplierForm(sup);
    setShowModal(true);
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    if (!clientForm.nombre) {
      alert('Ingresa el nombre del cliente.');
      return;
    }
    await saveClient(clientForm);
    setShowModal(false);
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!supplierForm.nombre) {
      alert('Ingresa el nombre del proveedor.');
      return;
    }
    await saveSupplier(supplierForm);
    setShowModal(false);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-surface-container-low shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-on-surface tracking-tight">Directorio de Contactos</h2>
          <p className="text-xs text-secondary">Agenda de clientes habituales para envíos y proveedores de mercadería</p>
        </div>

        <button
          onClick={handleOpenNew}
          className="bg-primary text-white font-bold px-6 py-3 rounded-full text-xs shadow-md hover:bg-surface-tint flex items-center gap-2 transition-transform active:scale-95"
        >
          <span className="material-symbols-outlined text-base">person_add</span>
          <span>{activeTab === 'clients' ? 'Nuevo Cliente' : 'Nuevo Proveedor'}</span>
        </button>
      </div>

      {/* Tabs Selector: Clientes vs Proveedores */}
      <div className="flex items-center gap-3 border-b border-surface-container-highest pb-3">
        <button
          onClick={() => { setActiveTab('clients'); setSearchTerm(''); }}
          className={`px-5 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${
            activeTab === 'clients'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white border border-surface-container-highest text-secondary hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined text-lg">group</span>
          <span>Catálogo de Clientes ({clients.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('suppliers'); setSearchTerm(''); }}
          className={`px-5 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${
            activeTab === 'suppliers'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white border border-surface-container-highest text-secondary hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined text-lg">local_shipping</span>
          <span>Catálogo de Proveedores ({suppliers.length})</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative w-full max-w-md">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary">
          search
        </span>
        <input
          type="text"
          className="w-full bg-white border border-surface-container-highest focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 pl-11 pr-4 text-sm outline-none shadow-xs"
          placeholder={activeTab === 'clients' ? "Buscar clientes por nombre, teléfono o dirección..." : "Buscar proveedores por nombre, rubro o contacto..."}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 1. SECCIÓN CLIENTES */}
      {/* ---------------------------------------------------------------- */}
      {activeTab === 'clients' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-2xl border text-center text-secondary">
              <span className="material-symbols-outlined text-4xl text-secondary mb-2 block">person_search</span>
              <p className="font-semibold text-sm">No se encontraron clientes en el catálogo.</p>
            </div>
          ) : (
            filteredClients.map(c => (
              <div key={c.id} className="bg-white rounded-2xl p-5 border border-surface-container-low shadow-sm flex flex-col justify-between gap-3 hover:border-primary transition-all">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-on-surface text-base flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-lg">account_circle</span>
                      <span>{c.nombre}</span>
                    </h3>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleEditClient(c)}
                        className="p-1.5 text-secondary hover:text-primary rounded-full"
                        title="Editar cliente"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm(`¿Eliminar al cliente "${c.nombre}"?`)) {
                            deleteClient(c.id);
                          }
                        }}
                        className="p-1.5 text-secondary hover:text-error rounded-full"
                        title="Eliminar cliente"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>

                  {c.telefono && (
                    <a 
                      href={`https://wa.me/549${c.telefono.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(c.nombre)}!`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5 w-fit border border-emerald-200 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">chat</span>
                      <span>WhatsApp: {c.telefono}</span>
                    </a>
                  )}

                  {c.direccion && (
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.direccion)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-secondary hover:text-primary flex items-start gap-1 mt-1 font-medium"
                    >
                      <span className="material-symbols-outlined text-sm text-amber-600 shrink-0 mt-0.5">location_on</span>
                      <span>{c.direccion}</span>
                    </a>
                  )}

                  {c.notas && (
                    <p className="text-xs text-secondary bg-surface-container-low p-2.5 rounded-xl border border-surface-container-highest mt-1">
                      📝 {c.notas}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 2. SECCIÓN PROVEEDORES */}
      {/* ---------------------------------------------------------------- */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-2xl border text-center text-secondary">
              <span className="material-symbols-outlined text-4xl text-secondary mb-2 block">store</span>
              <p className="font-semibold text-sm">No se encontraron proveedores en el catálogo.</p>
            </div>
          ) : (
            filteredSuppliers.map(s => (
              <div key={s.id} className="bg-white rounded-2xl p-5 border border-surface-container-low shadow-sm flex flex-col justify-between gap-3 hover:border-primary transition-all">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-on-surface text-base flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-lg">storefront</span>
                        <span>{s.nombre}</span>
                      </h3>
                      {s.contacto && (
                        <span className="text-xs text-secondary font-semibold">Contacto: {s.contacto}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleEditSupplier(s)}
                        className="p-1.5 text-secondary hover:text-primary rounded-full"
                        title="Editar proveedor"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm(`¿Eliminar al proveedor "${s.nombre}"?`)) {
                            deleteSupplier(s.id);
                          }
                        }}
                        className="p-1.5 text-secondary hover:text-error rounded-full"
                        title="Eliminar proveedor"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>

                  {s.rubro && (
                    <span className="text-xs font-bold text-primary bg-primary-container/30 px-3 py-1 rounded-xl w-fit">
                      🌾 {s.rubro}
                    </span>
                  )}

                  {s.telefono && (
                    <a 
                      href={`https://wa.me/549${s.telefono.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(s.contacto || s.nombre)}!`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5 w-fit border border-emerald-200 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">chat</span>
                      <span>WhatsApp: {s.telefono}</span>
                    </a>
                  )}

                  {s.direccion && (
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.direccion)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-secondary hover:text-primary flex items-start gap-1 mt-1 font-medium"
                    >
                      <span className="material-symbols-outlined text-sm text-amber-600 shrink-0 mt-0.5">location_on</span>
                      <span>{s.direccion}</span>
                    </a>
                  )}

                  {s.notas && (
                    <p className="text-xs text-secondary bg-surface-container-low p-2.5 rounded-xl border border-surface-container-highest mt-1">
                      📝 {s.notas}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* MODAL CREAR / EDITAR CLIENTE O PROVEEDOR */}
      {/* ---------------------------------------------------------------- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          {activeTab === 'clients' ? (
            <form onSubmit={handleSaveClient} className="bg-white rounded-3xl p-6 w-full max-w-md flex flex-col gap-4 shadow-xl border border-surface-container-highest">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined">person_add</span>
                  <span>{editingItem ? 'Editar Cliente' : 'Nuevo Cliente (Delivery)'}</span>
                </h3>
                <button type="button" onClick={() => setShowModal(false)} className="text-secondary font-bold">✕</button>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Nombre y Apellido *</label>
                <input
                  required
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary font-bold"
                  placeholder="Ej: María González"
                  value={clientForm.nombre}
                  onChange={e => setClientForm({ ...clientForm, nombre: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Teléfono / WhatsApp</label>
                <input
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary"
                  placeholder="Ej: 3814123456"
                  value={clientForm.telefono}
                  onChange={e => setClientForm({ ...clientForm, telefono: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Dirección de Entrega</label>
                <input
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary"
                  placeholder="Ej: 25 de Mayo 450, Piso 3A, S. M. de Tucumán"
                  value={clientForm.direccion}
                  onChange={e => setClientForm({ ...clientForm, direccion: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Notas / Indicaciones</label>
                <textarea
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary"
                  rows="2"
                  placeholder="Ej: Timbre A, cliente habitual de verduras"
                  value={clientForm.notas}
                  onChange={e => setClientForm({ ...clientForm, notas: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl border text-secondary font-semibold text-sm">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-xl shadow-md">Guardar Cliente</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSaveSupplier} className="bg-white rounded-3xl p-6 w-full max-w-md flex flex-col gap-4 shadow-xl border border-surface-container-highest">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined">local_shipping</span>
                  <span>{editingItem ? 'Editar Proveedor' : 'Nuevo Proveedor (Compras)'}</span>
                </h3>
                <button type="button" onClick={() => setShowModal(false)} className="text-secondary font-bold">✕</button>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Empresa / Nombre de Proveedor *</label>
                <input
                  required
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary font-bold"
                  placeholder="Ej: Huerta San José"
                  value={supplierForm.nombre}
                  onChange={e => setSupplierForm({ ...supplierForm, nombre: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-secondary mb-1">Nombre Contacto</label>
                  <input
                    className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary"
                    placeholder="Ej: Don Carlos"
                    value={supplierForm.contacto}
                    onChange={e => setSupplierForm({ ...supplierForm, contacto: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-secondary mb-1">Teléfono / WhatsApp</label>
                  <input
                    className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary"
                    placeholder="Ej: 3814778899"
                    value={supplierForm.telefono}
                    onChange={e => setSupplierForm({ ...supplierForm, telefono: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Rubro / Mercadería que abastece</label>
                <input
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary"
                  placeholder="Ej: Tomates, Papas por bolsa, Fruta de estación"
                  value={supplierForm.rubro}
                  onChange={e => setSupplierForm({ ...supplierForm, rubro: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Dirección / Puesto</label>
                <input
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary"
                  placeholder="Ej: Puesto 12, Mercado de Abasto"
                  value={supplierForm.direccion}
                  onChange={e => setSupplierForm({ ...supplierForm, direccion: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary mb-1">Notas Adicionales</label>
                <textarea
                  className="w-full bg-surface-container-low border border-surface-container-highest rounded-xl p-3 text-sm outline-none focus:border-primary"
                  rows="2"
                  placeholder="Ej: Entregas Lunes y Jueves temprano"
                  value={supplierForm.notas}
                  onChange={e => setSupplierForm({ ...supplierForm, notas: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl border text-secondary font-semibold text-sm">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-xl shadow-md">Guardar Proveedor</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
