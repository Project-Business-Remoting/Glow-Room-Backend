const express = require("express");

const {
  listReservationsAdmin,
  deleteReservationAdmin,
  emptyTrashAdmin,
} = require("../controllers/reservationController");
const { getSmtpStatus, testEmail, changePassword } = require("../controllers/adminController");
const { requireAdmin } = require("../middlewares/requireAdmin");

const router = express.Router();

// GET /admin/reservations?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get("/reservations", requireAdmin, listReservationsAdmin);

// DELETE /admin/reservations/trash (Vider la corbeille)
router.delete("/reservations/trash", requireAdmin, emptyTrashAdmin);

// DELETE /admin/reservations/:id (Suppression définitive)
router.delete("/reservations/:id", requireAdmin, deleteReservationAdmin);

// GET /admin/smtp-status
// Diagnostic SMTP (utile quand Render free n'a pas de shell)
router.get("/smtp-status", requireAdmin, getSmtpStatus);

// POST /admin/test-email
router.post("/test-email", requireAdmin, testEmail);

// PATCH /admin/password — changement de mot de passe autonome
router.patch("/password", requireAdmin, changePassword);

module.exports = router;
