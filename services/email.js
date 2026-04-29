const nodemailer = require("nodemailer");

const DEPOSIT_CENTS = 1500;

let _transporter = null;
let _verifyPromise = null;
let _lastVerifyError = null;

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

function _emailConfig() {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT) || 587;
  const user = process.env.EMAIL_USER;
  // Render/Gmail: l'UI affiche souvent l'app password avec espaces; on normalise.
  const pass = (process.env.EMAIL_PASS || "").replace(/\s+/g, "");
  const from = process.env.EMAIL_FROM;
  const owner = process.env.EMAIL_OWNER;
  const secure = port === 465;

  return { host, port, user, pass, from, owner, secure };
}

function _isEmailConfigured() {
  const { host, user, pass, from, owner } = _emailConfig();
  return Boolean(host && user && pass && from && owner);
}

function _getTransporter() {
  if (_transporter) return _transporter;

  const { host, port, user, pass, secure } = _emailConfig();

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    // Timeouts plus courts pour diagnostiquer rapidement en prod
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 20_000,
    // 587 => STARTTLS
    requireTLS: port === 587,
    tls: {
      // SNI
      servername: host,
    },
  });

  return _transporter;
}

async function _verifyOnce() {
  if (_verifyPromise) return _verifyPromise;
  _verifyPromise = (async () => {
    if (!_isEmailConfigured()) return false;
    try {
      const transporter = _getTransporter();
      await transporter.verify();
      _lastVerifyError = null;
      return true;
    } catch (err) {
      const { host, port, user } = _emailConfig();
      _lastVerifyError = err && err.message ? err.message : String(err);
      console.error(
        `[EMAIL] SMTP verify failed (host=${host}, port=${port}, user=${user}):`,
        err && err.message ? err.message : err,
      );
      return false;
    }
  })();
  return _verifyPromise;
}

async function checkSmtpConnection() {
  const { host, port, user, from, owner, secure } = _emailConfig();
  const configured = _isEmailConfigured();

  if (!configured) {
    return {
      configured: false,
      ok: false,
      error:
        "Email non configuré (EMAIL_HOST/EMAIL_PORT/EMAIL_USER/EMAIL_PASS/EMAIL_FROM/EMAIL_OWNER)",
      host,
      port,
      secure,
      user,
      from,
      owner,
    };
  }

  const ok = await _verifyOnce();

  return {
    configured: true,
    ok: Boolean(ok),
    error: ok ? null : _lastVerifyError || "SMTP verify failed",
    host,
    port,
    secure,
    user,
    from,
    owner,
  };
}

async function _sendMail(payload, label) {
  if (!_isEmailConfigured()) {
    console.error(
      `[EMAIL] ${label}: email non configuré (EMAIL_HOST/USER/PASS/FROM/OWNER requis)`,
    );
    return;
  }

  await _verifyOnce();
  const transporter = _getTransporter();

  try {
    await transporter.sendMail(payload);
  } catch (err) {
    const { host, port, user } = _emailConfig();
    console.error(
      `[EMAIL] ${label} failed (host=${host}, port=${port}, user=${user}):`,
      err && err.message ? err.message : err,
    );
    throw err;
  }
}

async function sendInteracInstructionsToClient(reservation) {
  if (!reservation?.email) return;
  await _sendMail(
    {
      from: process.env.EMAIL_FROM,
      to: reservation.email,
      subject: "Instructions Interac — Glow Room Hair",
      html: buildInteracInstructionsEmail(reservation),
    },
    "Instructions client",
  );
}

async function sendReservationConfirmedToClient(reservation) {
  if (!reservation?.email) return;
  await _sendMail(
    {
      from: process.env.EMAIL_FROM,
      to: reservation.email,
      subject: "Réservation confirmée — Glow Room Hair",
      html: buildConfirmedEmail(reservation),
    },
    "Confirmation client",
  );
}

async function sendReservationCancelledToClient(reservation) {
  if (!reservation?.email) return;
  await _sendMail(
    {
      from: process.env.EMAIL_FROM,
      to: reservation.email,
      subject: "Réservation annulée — Glow Room Hair",
      html: buildCancelledEmail(reservation),
    },
    "Annulation client",
  );
}

async function sendNotificationToOwner(reservation) {
  await _sendMail(
    {
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_OWNER,
      subject: `Nouvelle réservation — ${reservation.clientName}`,
      html: buildOwnerEmail(reservation),
    },
    "Notification owner",
  );
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
  checkSmtpConnection,
};
