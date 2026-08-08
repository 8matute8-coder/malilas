import { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// Hook para rastrear presencia activa de clientes en la tienda
export const useActiveVisitors = (isStoreMode = false) => {
  const [activeCount, setActiveCount] = useState(0);

  // 1. Si el usuario esta navegando la TIENDA, emitir "Heartbeat" (latido) de presencia activa
  useEffect(() => {
    if (!isStoreMode) return;

    // ID unico por pestaña/sesion de cliente
    let sessionId = sessionStorage.getItem('lamalila_visitor_id');
    if (!sessionId) {
      sessionId = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
      sessionStorage.setItem('lamalila_visitor_id', sessionId);
    }

    const visitorRef = doc(db, 'active_visitors', sessionId);

    const sendPing = async () => {
      try {
        await setDoc(visitorRef, {
          lastActive: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent
        }, { merge: true });
      } catch (err) {
        console.error("Error en heartbeat de visitante:", err);
      }
    };

    // Latido inicial y recurrente cada 20 segundos
    sendPing();
    const interval = setInterval(sendPing, 20000);

    // Al cerrar la pestaña, eliminar el registro
    const handleUnload = () => {
      try {
        deleteDoc(visitorRef);
      } catch (e) {}
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      try {
        deleteDoc(visitorRef);
      } catch (e) {}
    };
  }, [isStoreMode]);

  // 2. Escuchar en tiempo real la cantidad de visitantes activos (para el Panel Administrativo)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'active_visitors'), (snapshot) => {
      const now = Date.now();
      const cutoff = now - 45000; // Activos en los ultimos 45 segundos

      const activeDocs = snapshot.docs.filter(d => {
        const data = d.data();
        return data.lastActive && data.lastActive > cutoff;
      });

      setActiveCount(activeDocs.length);
    });

    return () => unsub();
  }, []);

  return { activeCount };
};
