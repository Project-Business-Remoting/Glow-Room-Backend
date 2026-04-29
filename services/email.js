const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_PORT === "465",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendConfirmationToClient(reservation) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: reservation.email,
    subject: "Confirmation de réservation — Glow Room Hair",
    html: buildClientEmail(reservation),
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

function buildClientEmail(r) {
  return `
    <h2>Bonjour ${r.clientName} !</h2>
    <p>Votre réservation chez <strong>Glow Room Hair</strong> est confirmée.</p>
    <ul>
      <li><strong>Service :</strong> ${r.service}</li>
      <li><strong>Date :</strong> ${r.date}</li>
      <li><strong>Heure :</strong> ${r.time}</li>
      <li><strong>Dépôt payé :</strong> 15,00 $ CAD (non remboursable)</li>
    </ul>
    <p>Politique d'annulation : préavis de 24h requis. Grâce de 15 minutes pour les retards.</p>
    <p>À bientôt !</p>
  `;
}

function buildOwnerEmail(r) {
  return `
    <h2>Nouvelle réservation reçue</h2>
    <ul>
      <li><strong>Client :</strong> ${r.clientName}</li>
      <li><strong>Service :</strong> ${r.service}</li>
      <li><strong>Date :</strong> ${r.date}</li>
      <li><strong>Heure :</strong> ${r.time}</li>
      <li><strong>Téléphone :</strong> ${r.phone || "—"}</li>
      <li><strong>Email :</strong> ${r.email || "—"}</li>
      <li><strong>Paiement :</strong> ${r.paymentMethod || "—"}</li>
      <li><strong>Statut :</strong> ${r.status || "—"}</li>
      <li><strong>Session Stripe :</strong> ${r.stripeSessionId || "—"}</li>
    </ul>
  `;
}

module.exports = { sendConfirmationToClient, sendNotificationToOwner };
