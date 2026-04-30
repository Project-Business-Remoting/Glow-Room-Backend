const {
  blockSlot,
  createReservation,
  getBusySlotsByDate,
  getReservationById,
  listReservationsByDateRange,
  updateReservation,
} = require("../services/reservationModel");

const {
  sendInteracInstructionsToClient,
  sendReservationCancelledToClient,
  sendReservationConfirmedToClient,
  sendNotificationToOwner,
  sendPaymentTimeoutNotificationToOwner,
} = require("../services/email");

const DEPOSIT_CENTS = 2500;
const ALLOWED_SLOTS = ["09:00", "16:00"];

function _isValidIsoDate(date) {
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

async function listReservationsAdmin(req, res, next) {
  try {
    const start = req.query?.start ? String(req.query.start) : null;
    const end = req.query?.end ? String(req.query.end) : null;

    if (start && !_isValidIsoDate(start)) {
      return res
        .status(400)
        .json({ error: "start invalide (YYYY-MM-DD attendu)" });
    }
    if (end && !_isValidIsoDate(end)) {
      return res
        .status(400)
        .json({ error: "end invalide (YYYY-MM-DD attendu)" });
    }

    const reservations = await listReservationsByDateRange({ start, end });
    return res.json({ reservations });
  } catch (err) {
    next(err);
  }
}

async function getReservation(req, res, next) {
  try {
    const { id } = req.params;
    const reservation = await getReservationById(id);

    if (!reservation) {
      return res.status(404).json({ error: "Réservation introuvable" });
    }

    // Ne jamais exposer l'email dans la réponse publique
    const { email, ...safeData } = reservation;
    res.json(safeData);
  } catch (err) {
    next(err);
  }
}

async function createReservationRequest(req, res, next) {
  try {
    const { clientName, service, date, slot, time, phone, email, lang } =
      req.body || {};

    const selectedSlot = (time || slot || "").trim();

    if (!clientName || !service || !date || !selectedSlot || !phone || !email) {
      return res.status(400).json({
        error:
          "Champs requis manquants : clientName, service, date, slot, phone, email",
      });
    }

    if (!_isValidIsoDate(date)) {
      return res
        .status(400)
        .json({ error: "Date invalide (YYYY-MM-DD attendu)" });
    }

    if (!ALLOWED_SLOTS.includes(selectedSlot)) {
      return res.status(400).json({ error: "Créneau invalide" });
    }

    const busySlots = await getBusySlotsByDate(date);
    if (busySlots.includes(selectedSlot)) {
      return res.status(409).json({ error: "Créneau indisponible" });
    }

    const reservation = await createReservation({
      clientName,
      service,
      date,
      slot: selectedSlot,
      phone,
      email,
      lang: lang === 'en' ? 'en' : 'fr', // sauvegardé pour les emails bilingues
      paymentMethod: "interac",
      status: "en_attente",
      amountPaid: null,
    });

    // Emails non-bloquants (ne pas faire échouer la réservation)
    sendInteracInstructionsToClient(reservation).catch((err) =>
      console.error("[EMAIL] Instructions client:", err.message),
    );
    sendNotificationToOwner(reservation).catch((err) =>
      console.error("[EMAIL] Notification owner:", err.message),
    );

    // Mettre en place un rappel dans 15 minutes pour la propriétaire
    setTimeout(async () => {
      try {
        const checkRes = await getReservationById(reservation.id);
        if (checkRes && checkRes.status === "en_attente") {
          await sendPaymentTimeoutNotificationToOwner(checkRes);
        }
      } catch (err) {
        console.error("[TIMEOUT] Erreur vérification 15min:", err.message);
      }
    }, 15 * 60 * 1000);

    return res.status(201).json({ id: reservation.id, lang: reservation.lang });
  } catch (err) {
    next(err);
  }
}

async function confirmReservation(req, res, next) {
  try {
    const { id } = req.params;
    const reservation = await getReservationById(id);
    if (!reservation) {
      return res.status(404).json({ error: "Réservation introuvable" });
    }

    const updated = await updateReservation(id, {
      status: "confirmé",
      amountPaid: 2500,
      confirmedAt: new Date().toISOString(),
    });

    sendReservationConfirmedToClient(updated).catch((err) =>
      console.error("[EMAIL] Confirmation client:", err.message),
    );

    const { email, ...safeData } = updated || {};
    return res.json(safeData);
  } catch (err) {
    next(err);
  }
}

async function cancelReservation(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const reservation = await getReservationById(id);
    if (!reservation) {
      return res.status(404).json({ error: "Réservation introuvable" });
    }

    const updated = await updateReservation(id, {
      status: "annulé",
      cancelledAt: new Date().toISOString(),
    });

    if (reason) updated.cancelReason = reason;

    sendReservationCancelledToClient(updated).catch((err) =>
      console.error("[EMAIL] Annulation client:", err.message),
    );

    const { email, ...safeData } = updated || {};
    return res.json(safeData);
  } catch (err) {
    next(err);
  }
}

async function blockSlotRequest(req, res, next) {
  try {
    const { date, slot, reason } = req.body || {};

    if (!_isValidIsoDate(date)) {
      return res
        .status(400)
        .json({ error: "Date invalide (YYYY-MM-DD attendu)" });
    }
    if (!ALLOWED_SLOTS.includes(String(slot || ""))) {
      return res.status(400).json({ error: "Créneau invalide" });
    }

    // Annuler les réservations existantes pour ce créneau
    const allRes = await listReservationsByDateRange({ start: date, end: date });
    const conflicts = allRes.filter(r => (r.slot === slot || r.time === slot) && r.status !== "annulé");
    
    for (const conflict of conflicts) {
      const updated = await updateReservation(conflict.id, {
        status: "annulé",
        cancelledAt: new Date().toISOString(),
      });
      updated.cancelReason = "Le créneau a dû être bloqué par le salon.";
      sendReservationCancelledToClient(updated).catch(e => console.error("[EMAIL] Auto-cancel:", e.message));
    }

    const blocked = await blockSlot({ date, slot, reason: reason || null });
    return res.status(201).json(blocked);
  } catch (err) {
    next(err);
  }
}

async function getSlotsDisponibles(req, res, next) {
  try {
    const date = req.query?.date;
    if (!date) {
      return res
        .status(400)
        .json({ error: "Paramètre requis manquant : date" });
    }
    const slots = await getBusySlotsByDate(date);
    return res.json({ slots });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getReservation,
  createReservationRequest,
  confirmReservation,
  cancelReservation,
  getSlotsDisponibles,
  blockSlotRequest,
  listReservationsAdmin,
};
