const { db } = require("./firebase");

const COLLECTION = "reservations";

async function createReservation(data) {
  const time = data.time || data.slot;
  const isStripe = Boolean(data.stripeSessionId);

  const doc = {
    clientName: data.clientName,
    service: data.service,
    date: data.date,
    time,
    // compat front (Interac) + compat historique (Stripe)
    slot: time,
    phone: data.phone || null,
    email: data.email || null,

    paymentMethod: data.paymentMethod || (isStripe ? "card" : "interac"),
    stripeSessionId: data.stripeSessionId || null,
    amountPaid:
      typeof data.amountPaid === "number"
        ? data.amountPaid
        : isStripe
          ? 1500
          : null,
    status: data.status || (isStripe ? "confirmed" : "pending"),
    createdAt: new Date().toISOString(),
  };
  const ref = await db.collection(COLLECTION).add(doc);
  return { id: ref.id, ...doc };
}

async function listReservationsByDate(date) {
  const snap = await db.collection(COLLECTION).where("date", "==", date).get();
  if (snap.empty) return [];
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getBusySlotsByDate(date) {
  const reservations = await listReservationsByDate(date);
  const slots = reservations
    .filter((r) => r && r.status !== "cancelled")
    .map((r) => r.time || r.slot)
    .filter(Boolean);
  return Array.from(new Set(slots));
}

async function getReservationById(id) {
  const snap = await db.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function getReservationByStripeSession(sessionId) {
  const snap = await db
    .collection(COLLECTION)
    .where("stripeSessionId", "==", sessionId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

module.exports = {
  createReservation,
  listReservationsByDate,
  getBusySlotsByDate,
  getReservationById,
  getReservationByStripeSession,
};
