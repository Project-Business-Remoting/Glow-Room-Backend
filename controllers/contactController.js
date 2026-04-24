const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_PORT === '465',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function escape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handleContact(req, res, next) {
  const { nom, email, telephone, message } = req.body;

  if (!nom || typeof nom !== 'string' || !nom.trim()) {
    return res.status(400).json({ error: 'Le nom est requis' });
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Adresse email invalide' });
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Le message est requis' });
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_OWNER,
      subject: `Message de contact — ${escape(nom.trim())}`,
      html: buildContactEmail({ nom, email, telephone, message }),
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

function buildContactEmail({ nom, email, telephone, message }) {
  return `
    <h2>Nouveau message de contact</h2>
    <ul>
      <li><strong>Nom :</strong> ${escape(nom)}</li>
      <li><strong>Email :</strong> ${escape(email)}</li>
      ${telephone ? `<li><strong>Téléphone :</strong> ${escape(telephone)}</li>` : ''}
    </ul>
    <h3>Message</h3>
    <p>${escape(message).replace(/\n/g, '<br>')}</p>
  `;
}

module.exports = { handleContact };
