const express = require("express");
const {
  createReservationRequest,
  cancelReservation,
  confirmReservation,
  getReservation,
  getSlotsDisponibles,
} = require("../controllers/reservationController");

const { requireAdmin } = require("../middlewares/requireAdmin");

const router = express.Router();

router.get("/slots-disponibles", getSlotsDisponibles);
router.post("/", createReservationRequest);
router.patch("/:id/confirmer", requireAdmin, confirmReservation);
router.patch("/:id/annuler", requireAdmin, cancelReservation);
router.get("/:id", getReservation);

module.exports = router;
