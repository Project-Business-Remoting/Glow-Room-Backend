const { db } = require("./firebase");

const COLLECTION = "reservations";
const BLOCKS_COLLECTION = "blocked_slots";

function _nowIso() {
  return new Date().toISOString();
}

function _isCancelledStatus(status) {
  const s = String(status || "").toLowerCase();
  return (
    s === "annulé" || s === "annule" || s === "cancelled" || s === "canceled"
  );
}

async function createReservation(data) {
  const time = data.time || data.slot;

  const doc = {
    clientName: data.clientName,
    service: data.service,
    date: data.date,
    time,
    // compat front (Interac) + compat historique (Stripe)
    slot: time,
    phone: data.phone || null,
    email: data.email || null,

    paymentMethod: data.paymentMethod || "interac",
    amountPaid: typeof data.amountPaid === "number" ? data.amountPaid : null,
    status: data.status || "en_attente",
    createdAt: _nowIso(),
  };
  const ref = await db.collection(COLLECTION).add(doc);
  return { id: ref.id, ...doc };
}

async function updateReservation(id, patch) {
  const ref = db.collection(COLLECTION).doc(id);
  await ref.update(patch);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function listReservationsByDate(date) {
  const snap = await db.collection(COLLECTION).where("date", "==", date).get();
  if (snap.empty) return [];
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function listBlockedSlotsByDate(date) {
  const snap = await db
    .collection(BLOCKS_COLLECTION)
    .where("date", "==", date)
    .get();
  if (snap.empty) return [];
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function blockSlot({ date, slot, reason = null }) {
  const id = `${date}_${slot}`;
  const ref = db.collection(BLOCKS_COLLECTION).doc(id);
  const doc = {
    date,
    slot,
    reason,
    createdAt: _nowIso(),
    active: true,
  };
  await ref.set(doc, { merge: true });
  return { id, ...doc };
}

async function getBusySlotsByDate(date) {
  const reservations = await listReservationsByDate(date);
  const blocks = await listBlockedSlotsByDate(date);
  const slots = reservations
    .filter((r) => r && !_isCancelledStatus(r.status))
    .map((r) => r.time || r.slot)
    .filter(Boolean);

  const blockedSlots = blocks
    .filter((b) => b && b.active !== false)
    .map((b) => b.slot)
    .filter(Boolean);

  return Array.from(new Set([...slots, ...blockedSlots]));
}

async function getReservationById(id) {
  const snap = await db.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

module.exports = {
  createReservation,
  updateReservation,
  listReservationsByDate,
  listBlockedSlotsByDate,
  blockSlot,
  getBusySlotsByDate,
  getReservationById,
};
