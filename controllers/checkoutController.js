const stripe = require('../services/stripe');

async function createCheckoutSession(req, res, next) {
  try {
    const { clientName, service, date, time } = req.body;

    if (!clientName || !service || !date || !time) {
      return res.status(400).json({ error: 'Champs requis manquants : clientName, service, date, time' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'cad',
            unit_amount: 1500, // 15,00 $
            product_data: {
              name: `Dépôt — ${service}`,
              description: `Réservation du ${date} à ${time}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { clientName, service, date, time },
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
}

module.exports = { createCheckoutSession };
