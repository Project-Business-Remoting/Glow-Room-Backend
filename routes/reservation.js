const express = require("express");
const {
  createReservationRequest,
  getReservation,
  getSlotsDisponibles,
} = require("../controllers/reservationController");

const router = express.Router();

router.get("/slots-disponibles", getSlotsDisponibles);
router.post("/", createReservationRequest);
router.get("/:id", getReservation);

module.exports = router;
