const { db } = require("./firebase");

const COLLECTION = "reservations";
const BLOCKS_COLLECTION = "blocked_slots";

const _slotsCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

function invalidateSlotsCache(date) {
  _slotsCache.delete(date);
}

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
    lang: data.lang || "fr",
    createdAt: _nowIso(),
  };
  const ref = await db.collection(COLLECTION).add(doc);
  invalidateSlotsCache(data.date);
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

async function listReservationsByDateRange({ start, end }) {
  let query = db.collection(COLLECTION);

  if (start && end) {
    query = query.where("date", ">=", start).where("date", "<=", end);
  } else if (start) {
    query = query.where("date", ">=", start);
  } else if (end) {
    query = query.where("date", "<=", end);
  }

  const snap = await query.get();
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
  invalidateSlotsCache(date);
  return { id, ...doc };
}

async function cancelReservationsBatch(reservations) {
  if (!reservations.length) return [];
  const cancelledAt = _nowIso();
  const cancelReason = "Le créneau a dû être bloqué par le salon.";
  const batch = db.batch();
  for (const r of reservations) {
    const ref = db.collection(COLLECTION).doc(r.id);
    batch.update(ref, { status: "annulé", cancelledAt, cancelReason });
  }
  await batch.commit();
  const dates = [...new Set(reservations.map((r) => r.date).filter(Boolean))];
  dates.forEach(invalidateSlotsCache);
  return reservations.map((r) => ({ ...r, status: "annulé", cancelledAt, cancelReason }));
}

async function getBusySlotsByDate(date) {
  const cached = _slotsCache.get(date);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const [reservations, blocks] = await Promise.all([
    listReservationsByDate(date),
    listBlockedSlotsByDate(date),
  ]);

  const slots = reservations
    .filter((r) => r && !_isCancelledStatus(r.status))
    .map((r) => r.time || r.slot)
    .filter(Boolean);

  const blockedSlots = blocks
    .filter((b) => b && b.active !== false)
    .map((b) => b.slot)
    .filter(Boolean);

  const result = Array.from(new Set([...slots, ...blockedSlots]));
  _slotsCache.set(date, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

async function getReservationById(id) {
  const snap = await db.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function deleteReservation(id) {
  await db.collection(COLLECTION).doc(id).delete();
}

async function deleteCancelledReservations() {
  const snapshot = await db
    .collection(COLLECTION)
    .where("status", "in", ["annulé", "annule", "cancelled", "canceled"])
    .get();

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  return snapshot.size;
}

module.exports = {
  createReservation,
  updateReservation,
  listReservationsByDate,
  listReservationsByDateRange,
  listBlockedSlotsByDate,
  blockSlot,
  getBusySlotsByDate,
  getReservationById,
  deleteReservation,
  deleteCancelledReservations,
  cancelReservationsBatch,
  invalidateSlotsCache,
};
