const {
  blockSlot,
  createReservation,
  getBusySlotsByDate,
  getReservationById,
  updateReservation,
} = require("../services/reservationModel");

const {
  sendInteracInstructionsToClient,
  sendReservationCancelledToClient,
  sendReservationConfirmedToClient,
  sendNotificationToOwner,
} = require("../services/email");

const ALLOWED_SLOTS = ["09:00", "16:00"];

function _isValidIsoDate(date) {
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);
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
    const { clientName, service, date, slot, time, phone, email } =
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

    return res.status(201).json({ id: reservation.id });
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
      amountPaid: 1500,
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
    const reservation = await getReservationById(id);
    if (!reservation) {
      return res.status(404).json({ error: "Réservation introuvable" });
    }

    const updated = await updateReservation(id, {
      status: "annulé",
      cancelledAt: new Date().toISOString(),
    });

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
};
