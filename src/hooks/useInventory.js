import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
const IMPORT_CATALOG = [
  { nombre: 'Mandarina bergamota', precioVenta: 2000, costoPromedio: 1000, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Manzana Seleccionada', precioVenta: 3000, costoPromedio: 1500, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Manzana verde Seleccionada grande', precioVenta: 4000, costoPromedio: 2000, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Pera', precioVenta: 800, costoPromedio: 400, tipoVenta: 'unidad', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Banana paraguaya', precioVenta: 3500, costoPromedio: 1750, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Banana ecuatoriana', precioVenta: 5000, costoPromedio: 2500, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Limón', precioVenta: 200, costoPromedio: 100, tipoVenta: 'unidad', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Pomelo rosado', precioVenta: 500, costoPromedio: 250, tipoVenta: 'unidad', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Naranja criolla', precioVenta: 2000, costoPromedio: 1000, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Naranja tanjerina', precioVenta: 2000, costoPromedio: 1000, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Palta hass mediana', precioVenta: 1500, costoPromedio: 750, tipoVenta: 'unidad', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Frutillas Seleccionadas (350gr)', precioVenta: 2500, costoPromedio: 1250, tipoVenta: 'unidad', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Brocoli', precioVenta: 1500, costoPromedio: 750, tipoVenta: 'unidad', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Rúcula', precioVenta: 1500, costoPromedio: 750, tipoVenta: 'unidad', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Acelga (atado grande)', precioVenta: 2500, costoPromedio: 1250, tipoVenta: 'unidad', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Espinaca (atado grande)', precioVenta: 2500, costoPromedio: 1250, tipoVenta: 'unidad', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Remolacha', precioVenta: 500, costoPromedio: 250, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Lechuga crespa', precioVenta: 3000, costoPromedio: 1500, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Lechuga repollada', precioVenta: 3000, costoPromedio: 1500, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Cebolla verde (atado min)', precioVenta: 500, costoPromedio: 250, tipoVenta: 'unidad', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Albahaca (mini)', precioVenta: 500, costoPromedio: 250, tipoVenta: 'unidad', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Perejil (atado min)', precioVenta: 500, costoPromedio: 250, tipoVenta: 'unidad', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Apio (atado min)', precioVenta: 500, costoPromedio: 250, tipoVenta: 'unidad', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Repollo liso/morado (cuarto)', precioVenta: 1000, costoPromedio: 500, tipoVenta: 'unidad', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Puerro', precioVenta: 500, costoPromedio: 250, tipoVenta: 'unidad', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Batata colorada premium', precioVenta: 2500, costoPromedio: 1250, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Papa blanca sepillada de lujo', precioVenta: 2000, costoPromedio: 1000, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Cebolla BLANCA Grande', precioVenta: 2500, costoPromedio: 1250, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Cebolla morada', precioVenta: 3000, costoPromedio: 1500, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Pepino', precioVenta: 2000, costoPromedio: 1000, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Zanahoria seleccionada', precioVenta: 2000, costoPromedio: 1000, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Ajo', precioVenta: 1000, costoPromedio: 500, tipoVenta: 'unidad', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Pimiento verde invernadero', precioVenta: 3000, costoPromedio: 1500, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Morrón rojo', precioVenta: 4000, costoPromedio: 2000, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Tomate redondo de lujo', precioVenta: 2000, costoPromedio: 1000, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Tomate perita de lujo', precioVenta: 1500, costoPromedio: 750, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Berenjena', precioVenta: 2500, costoPromedio: 1250, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Zapallo coreano', precioVenta: 3000, costoPromedio: 1500, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Zapallo brasilero', precioVenta: 2000, costoPromedio: 1000, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Zapallo plomo', precioVenta: 1200, costoPromedio: 600, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Zapallito verde de lujo', precioVenta: 2000, costoPromedio: 1000, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Zucchini', precioVenta: 2000, costoPromedio: 1000, tipoVenta: 'kg', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Huevo Blanco (Unidad)', precioVenta: 300, costoPromedio: 150, tipoVenta: 'unidad', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Maple 30 Huevos N°1', precioVenta: 5500, costoPromedio: 2750, tipoVenta: 'unidad', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Carbon de 5kg', precioVenta: 5000, costoPromedio: 2500, tipoVenta: 'unidad', stockActual: 0, stockMinimo: 0 },
  { nombre: 'Carbon de 3kg', precioVenta: 3000, costoPromedio: 1500, tipoVenta: 'unidad', stockActual: 0, stockMinimo: 0 }
].map((p, i) => ({ ...p, id: `cat-${i}` }));

export function useInventory() {
  const [products, setProducts] = useState([]);
  const [mermas, setMermas] = useState([]);

  // Cargar de Firestore y migrar si es necesario
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snapshot) => {
      const fbProducts = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      setProducts(fbProducts);

      // Si Firebase está vacío, migramos el localStorage
      if (fbProducts.length === 0 && !localStorage.getItem('migrated_to_fb')) {
        const storedProducts = localStorage.getItem('lamalila_products');
        let localProducts = storedProducts ? JSON.parse(storedProducts) : [];
        
        if (!localStorage.getItem('lamalila_catalog_imported_v1')) {
          localProducts = [...localProducts, ...IMPORT_CATALOG];
          localStorage.setItem('lamalila_catalog_imported_v1', 'true');
        }

        if (localProducts.length > 0) {
          const batch = writeBatch(db);
          localProducts.forEach(p => {
            const docRef = doc(db, 'products', p.id);
            batch.set(docRef, p);
          });
          batch.commit().then(() => {
            localStorage.setItem('migrated_to_fb', 'true');
            console.log("Migración a Firebase exitosa.");
          }).catch(console.error);
        }
      }
    });

    const storedMermas = localStorage.getItem('lamalila_mermas');
    if (storedMermas) {
      setMermas(JSON.parse(storedMermas));
    }

    return () => unsub();
  }, []);

  useEffect(() => {
    localStorage.setItem('lamalila_mermas', JSON.stringify(mermas));
  }, [mermas]);

  const saveProduct = async (productData) => {
    const id = productData.id || crypto.randomUUID();
    const productToSave = { ...productData, id };
    
    try {
      await setDoc(doc(db, 'products', id), productToSave);
      return id;
    } catch (error) {
      console.error("Error al guardar producto: ", error);
      alert("Hubo un error al guardar. Revisa tu conexión a internet.");
      return id;
    }
  };

  const addStock = async (productId, newQuantity, newCost, syncEggs = true) => {
    const p = products.find(prod => prod.id === productId);
    if (!p) return;

    const oldTotalValue = p.stockActual * p.costoPromedio;
    const newTotalValue = newQuantity * newCost;
    const totalStock = p.stockActual + newQuantity;
    const averageCost = totalStock > 0 ? Math.round((oldTotalValue + newTotalValue) / totalStock) : 0;
    
    try {
      await setDoc(doc(db, 'products', productId), {
        ...p,
        stockActual: totalStock,
        costoPromedio: averageCost
      }, { merge: true });

      // Sincronización de Maples de Huevo -> Huevo por Unidad (30 unidades por maple)
      const isMaple = p.nombre.toLowerCase().includes('maple');
      if (isMaple && syncEggs) {
        const huevoUnidad = products.find(prod => 
          prod.id !== productId && 
          prod.nombre.toLowerCase().includes('huevo') && 
          !prod.nombre.toLowerCase().includes('maple')
        );

        if (huevoUnidad) {
          const numEggsAdded = newQuantity * 30; // 30 huevos por maple
          const unitEggCost = Math.round(newCost / 30); // costo por huevo
          
          const oldEggValue = huevoUnidad.stockActual * huevoUnidad.costoPromedio;
          const newEggValue = numEggsAdded * unitEggCost;
          const totalEggStock = huevoUnidad.stockActual + numEggsAdded;
          const avgEggCost = totalEggStock > 0 ? Math.round((oldEggValue + newEggValue) / totalEggStock) : 0;

          await setDoc(doc(db, 'products', huevoUnidad.id), {
            ...huevoUnidad,
            stockActual: totalEggStock,
            costoPromedio: avgEggCost
          }, { merge: true });
        }
      }
    } catch (error) {
      console.error("Error al agregar stock:", error);
    }
  };

  const recordMerma = async (productId, quantity, motive) => {
    const p = products.find(prod => prod.id === productId);
    if (!p) return;

    try {
      await setDoc(doc(db, 'products', productId), {
        ...p,
        stockActual: Math.max(0, p.stockActual - quantity)
      }, { merge: true });

      // Registrar historial de merma (local por ahora)
      const newMerma = {
        id: crypto.randomUUID(),
        productId,
        fecha: new Date().toISOString(),
        cantidad: quantity,
        motivo: motive
      };
      setMermas([...mermas, newMerma]);
    } catch(err) {
      console.error(err);
    }
  };


  const deleteProduct = async (productId) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch(err) {
      console.error(err);
    }
  };

  const processSale = async (cartItems) => {
    try {
      const batch = writeBatch(db);
      
      cartItems.forEach(item => {
        const p = products.find(prod => prod.id === item.product.id);
        if (p) {
          const docRef = doc(db, 'products', p.id);
          batch.set(docRef, {
            ...p,
            stockActual: Math.max(0, p.stockActual - item.quantity)
          }, { merge: true });
        }
      });
      
      await batch.commit();
    } catch (error) {
      console.error("Error procesando venta:", error);
    }
  };

  const deleteMerma = (mermaId) => {
    setMermas(prev => prev.filter(m => m.id !== mermaId));
  };

  const clearAllMermas = () => {
    if (window.confirm('¿Estás seguro de vaciar y limpiar todo el historial de mermas?')) {
      setMermas([]);
    }
  };

  return {
    products,
    mermas,
    saveProduct,
    addStock,
    recordMerma,
    deleteMerma,
    clearAllMermas,
    deleteProduct,
    processSale
  };
}
