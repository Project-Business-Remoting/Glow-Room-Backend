const { getReservationById } = require('../services/reservationModel');

async function getReservation(req, res, next) {
  try {
    const { id } = req.params;
    const reservation = await getReservationById(id);

    if (!reservation) {
      return res.status(404).json({ error: 'Réservation introuvable' });
    }

    // Ne jamais exposer l'email dans la réponse publique
    const { email, ...safeData } = reservation;
    res.json(safeData);
  } catch (err) {
    next(err);
  }
}

module.exports = { getReservation };
