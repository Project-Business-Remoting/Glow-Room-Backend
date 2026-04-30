const nodemailer = require("nodemailer");

const DEPOSIT_CENTS = 2500;

let _transporter = null;
let _verifyPromise = null;
let _lastVerifyError = null;

function _useResend() {
  return Boolean(process.env.RESEND_API_KEY);
}

function _resendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  // Resend impose souvent un sender vérifié. Pour tests rapides, utiliser onboarding@resend.dev.
  const from = process.env.RESEND_FROM || process.env.EMAIL_FROM;
  const owner = process.env.EMAIL_OWNER;
  return { apiKey, from, owner };
}

function _isResendConfigured() {
  const { apiKey, from } = _resendConfig();
  return Boolean(apiKey && from);
}

async function _resendSendMail(payload, label) {
  const { apiKey, from } = _resendConfig();

  if (!_isResendConfigured()) {
    console.error(
      `[EMAIL] ${label}: Resend non configuré (RESEND_API_KEY + RESEND_FROM ou EMAIL_FROM requis)`,
    );
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const to = payload?.to;
    const subject = payload?.subject;
    const html = payload?.html;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const msg = text ? text.slice(0, 300) : `HTTP ${res.status}`;
      throw new Error(msg);
    }
  } finally {
    clearTimeout(timeout);
  }
}

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
  if (_useResend()) {
    const { from, owner } = _resendConfig();
    const configured = _isResendConfigured();
    return {
      provider: "resend",
      configured,
      ok: null,
      error: configured ? null : "Resend non configuré",
      host: null,
      port: null,
      secure: null,
      user: null,
      from,
      owner,
    };
  }

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
    provider: "smtp",
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
  if (_useResend()) {
    try {
      await _resendSendMail(payload, label);
    } catch (err) {
      console.error(
        `[EMAIL] ${label} failed (provider=resend):`,
        err && err.message ? err.message : err,
      );
      throw err;
    }
    return;
  }

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

async function sendTestEmail({ to } = {}) {
  const target = to || process.env.EMAIL_OWNER;
  if (!target) {
    throw new Error("EMAIL_OWNER manquant (ou fournissez 'to')");
  }
  await _sendMail(
    {
      from: process.env.EMAIL_FROM,
      to: target,
      subject: "Test email — Glow Room Backend",
      html: `<p>Test email envoyé depuis Glow Room Backend.</p><p>Date: ${_esc(
        new Date().toISOString(),
      )}</p>`,
    },
    "Test email",
  );
}

async function sendInteracInstructionsToClient(reservation) {
  if (!reservation?.email) return;
  const isEn = reservation.lang === 'en';
  await _sendMail(
    {
      from: process.env.EMAIL_FROM,
      to: reservation.email,
      subject: isEn ? "Interac Instructions — Glow Room Hair" : "Instructions Interac — Glow Room Hair",
      html: buildInteracInstructionsEmail(reservation),
    },
    "Instructions client",
  );
}

async function sendReservationConfirmedToClient(reservation) {
  if (!reservation?.email) return;
  const isEn = reservation.lang === 'en';
  await _sendMail(
    {
      from: process.env.EMAIL_FROM,
      to: reservation.email,
      subject: isEn ? "Booking Confirmed — Glow Room Hair" : "Réservation confirmée — Glow Room Hair",
      html: buildConfirmedEmail(reservation),
    },
    "Confirmation client",
  );
}

async function sendReservationCancelledToClient(reservation) {
  if (!reservation?.email) return;
  const isEn = reservation.lang === 'en';
  await _sendMail(
    {
      from: process.env.EMAIL_FROM,
      to: reservation.email,
      subject: isEn ? "Booking Cancelled — Glow Room Hair" : "Réservation annulée — Glow Room Hair",
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

async function sendPaymentTimeoutNotificationToOwner(reservation) {
  await _sendMail(
    {
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_OWNER,
      subject: `⚠️ Délai Interac dépassé — ${reservation.clientName}`,
      html: `
        <h2>Délai de paiement dépassé (15 min)</h2>
        <p>La réservation de <strong>${_esc(reservation.clientName)}</strong> (ID: ${_esc(reservation.id)}) a été faite il y a 15 minutes.</p>
        <p>Veuillez vérifier vos e-Transfers. Si aucun paiement n'a été reçu, allez sur votre espace Admin pour <strong>Annuler</strong> cette réservation et libérer le créneau.</p>
        <ul>
          <li><strong>Service :</strong> ${_esc(reservation.service)}</li>
          <li><strong>Date :</strong> ${_esc(reservation.date)}</li>
          <li><strong>Heure :</strong> ${_esc(reservation.time || reservation.slot)}</li>
        </ul>
      `,
    },
    "Notification timeout owner",
  );
}

function buildInteracInstructionsEmail(r) {
  const interacEmail = process.env.INTERAC_EMAIL || process.env.EMAIL_OWNER;
  const isEn = r.lang === 'en';

  if (isEn) {
    return `
      <h2>Hello ${_esc(r.clientName)}!</h2>
      <p>We have received your booking request for <strong>Glow Room Hair</strong>.</p>
      <p>
        To confirm your appointment, please send a deposit of
        <strong>${_moneyCADFromCents(DEPOSIT_CENTS)}</strong> via <strong>Interac e-Transfer</strong>
        to <strong>${_esc(interacEmail)}</strong>.
      </p>
      <p style="color: #d9534f; font-weight: bold; padding: 10px; border: 1px solid #d9534f; border-radius: 4px;">
        ⚠️ IMPORTANT: You have 15 minutes to send the transfer. After this time, the slot will automatically be released.
      </p>
      <ul>
        <li><strong>Service:</strong> ${_esc(r.service)}</li>
        <li><strong>Date:</strong> ${_esc(r.date)}</li>
        <li><strong>Time:</strong> ${_esc(r.time)}</li>
      </ul>
      <p>Interac Message/Note: <strong>${_esc(r.clientName)}</strong></p>
      <p>Your booking will be confirmed upon receipt of the payment.</p>
      <p>Thank you and see you soon!</p>
    `;
  }

  return `
    <h2>Bonjour ${_esc(r.clientName)} !</h2>
    <p>Nous avons bien reçu votre demande de réservation chez <strong>Glow Room Hair</strong>.</p>
    <p>
      Pour confirmer votre rendez-vous, veuillez envoyer un dépôt de
      <strong>${_moneyCADFromCents(DEPOSIT_CENTS)}</strong> via <strong>Interac e-Transfer</strong>
      à <strong>${_esc(interacEmail)}</strong>.
    </p>
    <p style="color: #d9534f; font-weight: bold; padding: 10px; border: 1px solid #d9534f; border-radius: 4px;">
      ⚠️ IMPORTANT : Vous avez 15 minutes pour effectuer le virement. Passé ce délai, le créneau sera automatiquement remis à disposition.
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
  const isEn = r.lang === 'en';
  if (isEn) {
    return `
      <h2>Booking Confirmed</h2>
      <p>Hello ${_esc(r.clientName)}, your appointment at <strong>Glow Room Hair</strong> is confirmed.</p>
      <ul>
        <li><strong>Service:</strong> ${_esc(r.service)}</li>
        <li><strong>Date:</strong> ${_esc(r.date)}</li>
        <li><strong>Time:</strong> ${_esc(r.time)}</li>
        <li><strong>Deposit received:</strong> ${_moneyCADFromCents(DEPOSIT_CENTS)} (non-refundable)</li>
      </ul>
      <p>Cancellation policy: 24h notice required. 15-minute grace period for lateness.</p>
      <p>See you soon!</p>
    `;
  }
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
  const isEn = r.lang === 'en';
  
  if (isEn) {
    const reasonTextEn = r.cancelReason 
      ? `<p><strong>Reason:</strong> ${_esc(r.cancelReason)}</p>`
      : `<p><strong>Reason:</strong> Payment time exceeded or cancelled at your request.</p>`;

    return `
      <h2>Booking Cancelled</h2>
      <p>Hello ${_esc(r.clientName)}, your booking has been cancelled.</p>
      ${reasonTextEn}
      <ul>
        <li><strong>Service:</strong> ${_esc(r.service)}</li>
        <li><strong>Date:</strong> ${_esc(r.date)}</li>
        <li><strong>Time:</strong> ${_esc(r.time)}</li>
      </ul>
      <p>If you wish to schedule a new appointment, you can book again on the website.</p>
    `;
  }

  const reasonText = r.cancelReason 
    ? `<p><strong>Raison :</strong> ${_esc(r.cancelReason)}</p>`
    : `<p><strong>Raison :</strong> Délai de paiement dépassé ou annulation à votre demande.</p>`;

  return `
    <h2>Réservation annulée</h2>
    <p>Bonjour ${_esc(r.clientName)}, votre réservation a été annulée.</p>
    ${reasonText}
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


function buildContactEmail({ nom, email, telephone, message }) {
  return `
    <h2>Nouveau message de contact</h2>
    <ul>
      <li><strong>Nom :</strong> ${_esc(nom)}</li>
      <li><strong>Email :</strong> ${_esc(email)}</li>
      ${telephone ? `<li><strong>Téléphone :</strong> ${_esc(telephone)}</li>` : ""}
    </ul>
    <h3>Message</h3>
    <p>${_esc(message).replace(/\n/g, "<br>")}</p>
  `;
}

async function sendContactEmail(data) {
  const { nom } = data;
  await _sendMail(
    {
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_OWNER,
      subject: `Message de contact — ${_esc(nom.trim())}`,
      html: buildContactEmail(data),
    },
    "Message contact",
  );
}

module.exports = {
  sendInteracInstructionsToClient,
  sendReservationConfirmedToClient,
  sendReservationCancelledToClient,
  sendNotificationToOwner,
  sendPaymentTimeoutNotificationToOwner,
  sendContactEmail,
  checkSmtpConnection,
  sendTestEmail,
};
