
const { db } = require('../services/firebase');

async function deleteCollection(collectionPath, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

async function clearAll() {
  try {
    console.log("--- Nettoyage de la base de données ---");
    
    console.log("Suppression des réservations...");
    await deleteCollection('reservations');
    
    console.log("Suppression des créneaux bloqués...");
    await deleteCollection('blocked_slots');
    
    console.log("✅ Base de données vidée avec succès.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erreur lors du nettoyage :", err);
    process.exit(1);
  }
}

clearAll();
