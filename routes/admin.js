const express = require("express");

const {
  listReservationsAdmin,
} = require("../controllers/reservationController");
const { getSmtpStatus, testEmail } = require("../controllers/adminController");
const { requireAdmin } = require("../middlewares/requireAdmin");

const router = express.Router();

// GET /admin/reservations?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get("/reservations", requireAdmin, listReservationsAdmin);

// GET /admin/smtp-status
// Diagnostic SMTP (utile quand Render free n'a pas de shell)
router.get("/smtp-status", requireAdmin, getSmtpStatus);

// POST /admin/test-email
router.post("/test-email", requireAdmin, testEmail);

module.exports = router;
