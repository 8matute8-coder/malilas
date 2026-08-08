import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const useContacts = () => {
  const [clients, setClients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Sync Clients from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      
      // Auto-clean sample clients if present
      const sampleIds = ['cli-1', 'cli-2', 'cli-3'];
      docs.forEach(async (d) => {
        if (sampleIds.includes(d.id)) {
          try { await deleteDoc(doc(db, 'clients', d.id)); } catch (e) {}
        }
      });

      const filtered = docs.filter(d => !sampleIds.includes(d.id));
      filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setClients(filtered);
    }, err => console.error("Error clients:", err));
    return () => unsub();
  }, []);

  // Sync Suppliers from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      
      // Auto-clean sample suppliers if present
      const sampleIds = ['sup-1', 'sup-2', 'sup-3'];
      docs.forEach(async (d) => {
        if (sampleIds.includes(d.id)) {
          try { await deleteDoc(doc(db, 'suppliers', d.id)); } catch (e) {}
        }
      });

      const filtered = docs.filter(d => !sampleIds.includes(d.id));
      filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setSuppliers(filtered);
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
