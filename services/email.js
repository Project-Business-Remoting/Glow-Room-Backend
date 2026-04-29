const nodemailer = require("nodemailer");

const DEPOSIT_CENTS = 1500;

function _esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function _moneyCADFromCents(cents) {
  if (typeof cents !== "number") return "";
  return `${(cents / 100).toFixed(2).replace(".", ",")} $ CAD`;
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_PORT === "465",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendInteracInstructionsToClient(reservation) {
  if (!reservation?.email) return;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: reservation.email,
    subject: "Instructions Interac — Glow Room Hair",
    html: buildInteracInstructionsEmail(reservation),
  });
}

async function sendReservationConfirmedToClient(reservation) {
  if (!reservation?.email) return;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: reservation.email,
    subject: "Réservation confirmée — Glow Room Hair",
    html: buildConfirmedEmail(reservation),
  });
}

async function sendReservationCancelledToClient(reservation) {
  if (!reservation?.email) return;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: reservation.email,
    subject: "Réservation annulée — Glow Room Hair",
    html: buildCancelledEmail(reservation),
  });
}

async function sendNotificationToOwner(reservation) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_OWNER,
    subject: `Nouvelle réservation — ${reservation.clientName}`,
    html: buildOwnerEmail(reservation),
  });
}

function buildInteracInstructionsEmail(r) {
  const interacEmail = process.env.INTERAC_EMAIL || process.env.EMAIL_OWNER;
  return `
    <h2>Bonjour ${_esc(r.clientName)} !</h2>
    <p>Nous avons bien reçu votre demande de réservation chez <strong>Glow Room Hair</strong>.</p>
    <p>
      Pour confirmer votre rendez-vous, veuillez envoyer un dépôt de
      <strong>${_moneyCADFromCents(DEPOSIT_CENTS)}</strong> via <strong>Interac e-Transfer</strong>
      à <strong>${_esc(interacEmail)}</strong>.
    </p>
    <ul>
      <li><strong>Service :</strong> ${_esc(r.service)}</li>
      <li><strong>Date :</strong> ${_esc(r.date)}</li>
      <li><strong>Heure :</strong> ${_esc(r.time)}</li>
    </ul>
    <p>Message/Note Interac : <strong>${_esc(r.clientName)}</strong></p>
    <p>Votre réservation sera confirmée dès réception du paiement.</p>
    <p>Merci et à bientôt !</p>
  `;
}

function buildConfirmedEmail(r) {
  return `
    <h2>Réservation confirmée</h2>
    <p>Bonjour ${_esc(r.clientName)}, votre rendez-vous chez <strong>Glow Room Hair</strong> est confirmé.</p>
    <ul>
      <li><strong>Service :</strong> ${_esc(r.service)}</li>
      <li><strong>Date :</strong> ${_esc(r.date)}</li>
      <li><strong>Heure :</strong> ${_esc(r.time)}</li>
      <li><strong>Dépôt reçu :</strong> ${_moneyCADFromCents(DEPOSIT_CENTS)} (non remboursable)</li>
    </ul>
    <p>Politique d'annulation : préavis de 24h requis. Grâce de 15 minutes pour les retards.</p>
    <p>À bientôt !</p>
  `;
}

function buildCancelledEmail(r) {
  return `
    <h2>Réservation annulée</h2>
    <p>Bonjour ${_esc(r.clientName)}, votre réservation a été annulée.</p>
    <ul>
      <li><strong>Service :</strong> ${_esc(r.service)}</li>
      <li><strong>Date :</strong> ${_esc(r.date)}</li>
      <li><strong>Heure :</strong> ${_esc(r.time)}</li>
    </ul>
    <p>Si vous souhaitez reprendre un rendez-vous, vous pouvez réserver à nouveau sur le site.</p>
  `;
}

function buildOwnerEmail(r) {
  return `
    <h2>Nouvelle réservation reçue</h2>
    <ul>
      <li><strong>Client :</strong> ${_esc(r.clientName)}</li>
      <li><strong>Service :</strong> ${_esc(r.service)}</li>
      <li><strong>Date :</strong> ${_esc(r.date)}</li>
      <li><strong>Heure :</strong> ${_esc(r.time)}</li>
      <li><strong>Téléphone :</strong> ${_esc(r.phone || "—")}</li>
      <li><strong>Email :</strong> ${_esc(r.email || "—")}</li>
      <li><strong>Paiement :</strong> ${_esc(r.paymentMethod || "—")}</li>
      <li><strong>Statut :</strong> ${_esc(r.status || "—")}</li>
    </ul>
  `;
}

module.exports = {
  sendInteracInstructionsToClient,
  sendReservationConfirmedToClient,
  sendReservationCancelledToClient,
  sendNotificationToOwner,
};
