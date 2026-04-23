function validateCheckout(req, res, next) {
  const { clientName, service, date, time } = req.body;
  const errors = [];

  if (!clientName || typeof clientName !== 'string' || clientName.trim().length < 2) {
    errors.push('clientName invalide');
  }
  if (!service || typeof service !== 'string' || service.trim().length < 2) {
    errors.push('service invalide');
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push('date invalide (format attendu : YYYY-MM-DD)');
  }
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    errors.push('time invalide (format attendu : HH:MM)');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Données invalides', details: errors });
  }

  next();
}

module.exports = { validateCheckout };
