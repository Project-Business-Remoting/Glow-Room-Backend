const express = require("express");

const { blockSlotRequest } = require("../controllers/reservationController");
const { requireAdmin } = require("../middlewares/requireAdmin");

const router = express.Router();

// POST /bloquer-creneau
router.post("/", requireAdmin, blockSlotRequest);

module.exports = router;
