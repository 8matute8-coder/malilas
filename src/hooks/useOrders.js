import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

export function useOrders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    let isInitialLoad = true;

    const playNotificationSound = () => {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioCtx.currentTime;
        
        // Nota 1 (Chime agudo)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now); // E5
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.4);

        // Nota 2 (Chime más agudo)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now + 0.15); // A5
        gain2.gain.setValueAtTime(0.4, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.8);
      } catch (e) {
        console.log('Audio alert allowed after user interaction:', e);
      }
    };

    const unsub = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const fbOrders = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      // Ordenar por fecha descendente
      fbOrders.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setOrders(fbOrders);

      if (isInitialLoad) {
        isInitialLoad = false;
      } else {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            playNotificationSound();
          }
        });
      }

      // Migrar desde localStorage
      if (fbOrders.length === 0 && !localStorage.getItem('migrated_orders_to_fb')) {
        const storedOrders = localStorage.getItem('lamalila_orders');
        if (storedOrders) {
          const parsed = JSON.parse(storedOrders);
          if (parsed.length > 0) {
            const batch = writeBatch(db);
            parsed.forEach(o => {
              const docRef = doc(db, 'orders', o.id);
              batch.set(docRef, o);
            });
            batch.commit().then(() => {
              localStorage.setItem('migrated_orders_to_fb', 'true');
            }).catch(console.error);
          }
        }
      }
    });
    return () => unsub();
  }, []);

  const addOrder = async (orderData) => {
    const shortId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const id = crypto.randomUUID();
    const newOrder = {
      ...orderData,
      id,
      displayId: `PED-${shortId}`,
      fecha: new Date().toISOString(),
      estado: 'pendiente'
    };
    try {
      await setDoc(doc(db, 'orders', id), newOrder);
    } catch (error) {
      console.error("Error creating order:", error);
    }
  };

  const restoreOrder = async (order) => {
    try {
      await setDoc(doc(db, 'orders', order.id), { ...order, estado: 'enviado' });
    } catch (error) {
      console.error("Error restoring order:", error);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    try {
      await setDoc(doc(db, 'orders', orderId), { ...order, estado: status }, { merge: true });
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  const deleteOrder = async (orderId) => {
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (error) {
      console.error("Error deleting order:", error);
    }
  };

  return {
    orders,
    addOrder,
    restoreOrder,
    updateOrderStatus,
    deleteOrder
  };
}
