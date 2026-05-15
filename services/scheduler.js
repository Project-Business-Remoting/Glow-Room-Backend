const { db } = require("./firebase");
const { sendPaymentTimeoutNotificationToOwner, sendReservationCancelledToClient } = require("./email");
const { invalidateSlotsCache } = require("./reservationModel");

const CHECK_INTERVAL_MS = 2 * 60 * 1000;
const TIMEOUT_MS = 15 * 60 * 1000;

async function _checkPendingTimeouts() {
  const cutoff = new Date(Date.now() - TIMEOUT_MS).toISOString();
  try {
    const snap = await db.collection("reservations")
      .where("status", "==", "en_attente")
      .get();

    const expired = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((r) => !r.timeoutNotifiedAt && r.createdAt <= cutoff);

    for (const reservation of expired) {
      try {
        await db.collection("reservations").doc(reservation.id).update({
          status: "annulé",
          cancelledAt: new Date().toISOString(),
          cancelReason: "Délai de paiement (15 min) dépassé.",
          timeoutNotifiedAt: new Date().toISOString(),
        });

        // Libérer le créneau dans le cache
        invalidateSlotsCache(reservation.date);

        // Prévenir le client que c'est annulé automatiquement
        await sendReservationCancelledToClient(reservation).catch(err => 
          console.error("[SCHEDULER] Client cancel notification error:", err.message)
        );

        // Prévenir la propriétaire
        await sendPaymentTimeoutNotificationToOwner(reservation);
      } catch (err) {
        console.error("[SCHEDULER] Timeout notification error:", err.message);
      }
    }
  } catch (err) {
    console.error("[SCHEDULER] Check failed:", err.message);
  }
}

function startPaymentTimeoutMonitor() {
  _checkPendingTimeouts();
  setInterval(_checkPendingTimeouts, CHECK_INTERVAL_MS);
}

module.exports = { startPaymentTimeoutMonitor };
