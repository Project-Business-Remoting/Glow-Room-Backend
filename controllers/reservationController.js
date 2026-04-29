const {
  createReservation,
  getBusySlotsByDate,
  getReservationById,
} = require("../services/reservationModel");

const { sendNotificationToOwner } = require("../services/email");

const ALLOWED_SLOTS = ["09:00", "16:00"];

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
      status: "pending",
      amountPaid: null,
      stripeSessionId: null,
    });

    // Email non-bloquant (ne pas faire échouer la réservation)
    sendNotificationToOwner({ ...reservation, phone, email }).catch((err) =>
      console.error("[EMAIL] Notification owner:", err.message),
    );

    return res.status(201).json({ id: reservation.id });
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
  getSlotsDisponibles,
};
