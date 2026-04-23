const { db } = require('./firebase');

const COLLECTION = 'reservations';

async function createReservation(data) {
  const doc = {
    clientName: data.clientName,
    service: data.service,
    date: data.date,
    time: data.time,
    stripeSessionId: data.stripeSessionId,
    amountPaid: 1500, // 15,00 $ en centimes
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };
  const ref = await db.collection(COLLECTION).add(doc);
  return { id: ref.id, ...doc };
}

async function getReservationById(id) {
  const snap = await db.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function getReservationByStripeSession(sessionId) {
  const snap = await db
    .collection(COLLECTION)
    .where('stripeSessionId', '==', sessionId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

module.exports = { createReservation, getReservationById, getReservationByStripeSession };
