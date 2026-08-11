import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const useAccounting = (inventoryData) => {
  const [purchases, setPurchases] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [extraMovements, setExtraMovements] = useState([]);

  // Sync Compras (Purchases) from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'purchases'), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      docs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setPurchases(docs);
    }, (err) => console.error("Error compras:", err));
    return () => unsub();
  }, []);

  // Sync Gastos Fijos (Expenses) from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      docs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setExpenses(docs);
    }, (err) => console.error("Error gastos:", err));
    return () => unsub();
  }, []);

  // Sync Movimientos Extras (Extra Movements) from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'extra_movements'), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      docs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setExtraMovements(docs);
    }, (err) => console.error("Error extras:", err));
    return () => unsub();
  }, []);

  // 1. Registrar Compra (y actualizar Inventario)
  const recordPurchase = async (purchaseData) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const newPurchase = {
      id,
      fecha: new Date().toISOString(),
      productId: purchaseData.productId || null,
      productNombre: purchaseData.productNombre || 'Producto Varios',
      proveedor: purchaseData.proveedor || 'Proveedor General',
      cantidad: parseFloat(purchaseData.cantidad) || 0,
      costoUnitario: parseFloat(purchaseData.costoUnitario) || 0,
      precioTotal: parseFloat(purchaseData.precioTotal) || 0,
      categoria: purchaseData.categoria || 'Mercadería (Stock)'
    };

    try {
      await setDoc(doc(db, 'purchases', id), newPurchase);

      // Sincronización automática de inventario (solo si es Mercadería / Stock)
      if (purchaseData.productId && inventoryData?.addStock && (!purchaseData.categoria || purchaseData.categoria.includes('Mercadería') || purchaseData.categoria.includes('Stock'))) {
        await inventoryData.addStock(
          purchaseData.productId, 
          newPurchase.cantidad, 
          newPurchase.costoUnitario
        );
      }
    } catch (error) {
      console.error("Error registrando compra:", error);
    }
  };

  const updatePurchaseCategory = async (id, categoria) => {
    try {
      await setDoc(doc(db, 'purchases', id), { categoria }, { merge: true });
    } catch (err) {
      console.error("Error actualizando categoría de compra:", err);
    }
  };

  const deletePurchase = async (id) => {
    try {
      await deleteDoc(doc(db, 'purchases', id));
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Registrar / Cambiar Gasto Fijo
  const recordExpense = async (expenseData) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const newExpense = {
      id,
      fecha: new Date().toISOString(),
      concepto: expenseData.concepto || 'Gasto General',
      categoria: expenseData.categoria || 'Servicios',
      monto: parseFloat(expenseData.monto) || 0,
      estado: expenseData.estado || 'Pendiente' // 'Pagado' o 'Pendiente'
    };

    try {
      await setDoc(doc(db, 'expenses', id), newExpense);
    } catch (error) {
      console.error("Error registrando gasto:", error);
    }
  };

  const toggleExpenseStatus = async (expense) => {
    try {
      const newStatus = expense.estado === 'Pagado' ? 'Pendiente' : 'Pagado';
      await setDoc(doc(db, 'expenses', expense.id), {
        ...expense,
        estado: newStatus
      }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteExpense = async (id) => {
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Registrar Movimiento Extra (Ingreso o Gasto Extra)
  const recordExtraMovement = async (movementData) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const newMovement = {
      id,
      fecha: new Date().toISOString(),
      tipo: movementData.tipo || 'ingreso', // 'ingreso' o 'gasto'
      concepto: movementData.concepto || 'Movimiento Extra',
      monto: parseFloat(movementData.monto) || 0
    };

    try {
      await setDoc(doc(db, 'extra_movements', id), newMovement);
    } catch (error) {
      console.error("Error registrando movimiento extra:", error);
    }
  };

  const deleteExtraMovement = async (id) => {
    try {
      await deleteDoc(doc(db, 'extra_movements', id));
    } catch (err) {
      console.error(err);
    }
  };

  return {
    purchases,
    expenses,
    extraMovements,
    recordPurchase,
    updatePurchaseCategory,
    deletePurchase,
    recordExpense,
    toggleExpenseStatus,
    deleteExpense,
    recordExtraMovement,
    deleteExtraMovement
  };
};
