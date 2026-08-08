import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

const INITIAL_CLIENTS = [
  {
    id: 'cli-1',
    nombre: 'María González',
    telefono: '3814123456',
    direccion: '25 de Mayo 450, Piso 3A, S. M. de Tucumán',
    notas: 'Timbre 3A. Paga con transferencia Mercado Pago.',
    fechaCreacion: new Date().toISOString()
  },
  {
    id: 'cli-2',
    nombre: 'Juan Carlos Pérez',
    telefono: '3815987654',
    direccion: 'San Martín 820, PB, S. M. de Tucumán',
    notas: 'Dejar en portería si no atiende.',
    fechaCreacion: new Date().toISOString()
  },
  {
    id: 'cli-3',
    nombre: 'Lucía Fernández',
    telefono: '3816554433',
    direccion: 'Jujuy 310, S. M. de Tucumán',
    notas: 'Cliente habitual de verduras orgánicas.',
    fechaCreacion: new Date().toISOString()
  }
];

const INITIAL_SUPPLIERS = [
  {
    id: 'sup-1',
    nombre: 'Huerta San José',
    contacto: 'Don Carlos',
    telefono: '3814778899',
    rubro: 'Hortalizas y Tomates de Quinta',
    direccion: 'Puesto 12, Mercado de Abasto Tucumán',
    notas: 'Entregas Lunes y Jueves a primera hora.',
    fechaCreacion: new Date().toISOString()
  },
  {
    id: 'sup-2',
    nombre: 'Distribuidora El Valle',
    contacto: 'Roberto Valenzuela',
    telefono: '3815332211',
    rubro: 'Papas, Cebollas y Zapallos por bolsa',
    direccion: 'Av. Circunvalación km 5',
    notas: 'Venta por bolsa de 20kg y 50kg.',
    fechaCreacion: new Date().toISOString()
  },
  {
    id: 'sup-3',
    nombre: 'Finca La Esmeralda',
    contacto: 'Esteban Maza',
    telefono: '3816112233',
    rubro: 'Frutas de Estación (Mandarinas, Naranjas, Manzanas)',
    direccion: 'Lules, Tucumán',
    notas: 'Fruta fresca seleccionada directo de finca.',
    fechaCreacion: new Date().toISOString()
  }
];

export const useContacts = () => {
  const [clients, setClients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Sync Clients from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      docs.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setClients(docs);

      // Seed initial clients if empty
      if (docs.length === 0 && !localStorage.getItem('migrated_clients_to_fb')) {
        INITIAL_CLIENTS.forEach(async (cli) => {
          await setDoc(doc(db, 'clients', cli.id), cli);
        });
        localStorage.setItem('migrated_clients_to_fb', 'true');
      }
    }, err => console.error("Error clients:", err));
    return () => unsub();
  }, []);

  // Sync Suppliers from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      docs.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setSuppliers(docs);

      // Seed initial suppliers if empty
      if (docs.length === 0 && !localStorage.getItem('migrated_suppliers_to_fb')) {
        INITIAL_SUPPLIERS.forEach(async (sup) => {
          await setDoc(doc(db, 'suppliers', sup.id), sup);
        });
        localStorage.setItem('migrated_suppliers_to_fb', 'true');
      }
    }, err => console.error("Error suppliers:", err));
    return () => unsub();
  }, []);

  // Save / Update Client
  const saveClient = async (clientData) => {
    const id = clientData.id || ('cli-' + Date.now().toString(36));
    const dataToSave = {
      id,
      nombre: clientData.nombre || 'Cliente',
      telefono: clientData.telefono || '',
      direccion: clientData.direccion || '',
      notas: clientData.notas || '',
      fechaCreacion: clientData.fechaCreacion || new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'clients', id), dataToSave);
      return id;
    } catch (err) {
      console.error("Error guardando cliente:", err);
    }
  };

  const deleteClient = async (id) => {
    try {
      await deleteDoc(doc(db, 'clients', id));
    } catch (err) {
      console.error(err);
    }
  };

  // Save / Update Supplier
  const saveSupplier = async (supplierData) => {
    const id = supplierData.id || ('sup-' + Date.now().toString(36));
    const dataToSave = {
      id,
      nombre: supplierData.nombre || 'Proveedor',
      contacto: supplierData.contacto || '',
      telefono: supplierData.telefono || '',
      rubro: supplierData.rubro || '',
      direccion: supplierData.direccion || '',
      notas: supplierData.notas || '',
      fechaCreacion: supplierData.fechaCreacion || new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'suppliers', id), dataToSave);
      return id;
    } catch (err) {
      console.error("Error guardando proveedor:", err);
    }
  };

  const deleteSupplier = async (id) => {
    try {
      await deleteDoc(doc(db, 'suppliers', id));
    } catch (err) {
      console.error(err);
    }
  };

  return {
    clients,
    suppliers,
    saveClient,
    deleteClient,
    saveSupplier,
    deleteSupplier
  };
};
