const { sendContactEmail } = require('../services/email');

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
    // Utilise le service centralisé qui gère Resend ou SMTP
    await sendContactEmail({ nom, email, telephone, message });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { handleContact };
