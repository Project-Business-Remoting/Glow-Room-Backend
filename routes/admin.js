const express = require("express");

const {
  listReservationsAdmin,
} = require("../controllers/reservationController");
const { requireAdmin } = require("../middlewares/requireAdmin");

const router = express.Router();

// GET /admin/reservations?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get("/reservations", requireAdmin, listReservationsAdmin);

module.exports = router;
