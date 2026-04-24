const stripe = require('../services/stripe');
const { createReservation, getReservationByStripeSession } = require('../services/reservationModel');
const { sendConfirmationToClient, sendNotificationToOwner } = require('../services/email');

async function handleWebhook(req, res, next) {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`[WEBHOOK] Signature invalide : ${err.message}`);
    return res.status(400).send('Webhook Error');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const existing = await getReservationByStripeSession(session.id);
    if (existing) {
      return res.json({ received: true });
    }

    console.log('[WEBHOOK] Session reçue:', JSON.stringify(session.metadata));

    const clientName = session.metadata?.clientName || 'Client inconnu';
    const service = session.metadata?.service || 'Service non spécifié';
    const date = session.metadata?.date || 'Date non spécifiée';
    const time = session.metadata?.time || 'Heure non spécifiée';

    try {
      const reservation = await createReservation({
        clientName,
        service,
        date,
        time,
        stripeSessionId: session.id,
      });

      const reservationWithEmail = {
        ...reservation,
        email: session.customer_details?.email,
      };

      await Promise.all([
        sendConfirmationToClient(reservationWithEmail),
        sendNotificationToOwner(reservationWithEmail),
      ]);
    } catch (err) {
      console.error('[WEBHOOK] Erreur traitement:', err);
    }
  }

  res.json({ received: true });
}

module.exports = { handleWebhook };
