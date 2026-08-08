import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
export const useSales = () => {
  const [sales, setSales] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'sales'), (snapshot) => {
      const fbSales = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      fbSales.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setSales(fbSales);

      if (fbSales.length === 0 && !localStorage.getItem('migrated_sales_to_fb')) {
        const saved = localStorage.getItem('lamalila_sales');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.length > 0) {
            const batch = writeBatch(db);
            parsed.forEach(s => {
              const docRef = doc(db, 'sales', s.id);
              batch.set(docRef, s);
            });
            batch.commit().then(() => {
              localStorage.setItem('migrated_sales_to_fb', 'true');
            }).catch(console.error);
          }
        }
      }
    });
    return () => unsub();
  }, []);

  const recordSale = async (items, total, type, cliente = 'Mostrador', originalOrder = null) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const newSale = {
      id,
      fecha: new Date().toISOString(),
      items: items,
      total: total,
      type: type,
      cliente: cliente,
      originalOrder: originalOrder
    };
    try {
      await setDoc(doc(db, 'sales', id), newSale);
    } catch (error) {
      console.error("Error guardando venta:", error);
    }
  };

  const clearHistory = async () => {
    if(window.confirm('¿Estás seguro de que deseas borrar todo el historial de ventas?')) {
      try {
        const batch = writeBatch(db);
        sales.forEach(s => {
          batch.delete(doc(db, 'sales', s.id));
        });
        await batch.commit();
      } catch(err) {
        console.error(err);
      }
    }
  };

  const deleteSale = async (saleId) => {
    try {
      await deleteDoc(doc(db, 'sales', saleId));
    } catch(err) {
      console.error(err);
    }
  };

  return { sales, recordSale, clearHistory, deleteSale };
};
