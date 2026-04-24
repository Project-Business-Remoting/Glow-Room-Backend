require('dotenv').config();
const express = require('express');
const cors = require('cors');

const checkoutRouter = require('./routes/checkout');
const webhookRouter = require('./routes/webhook');
const reservationRouter = require('./routes/reservation');

const app = express();
const PORT = process.env.PORT || 3000;

// /webhook doit recevoir le raw body AVANT express.json()
app.use('/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// CORS — exclut /webhook qui est appelé par Stripe
// directement (pas un navigateur)
app.use((req, res, next) => {
  if (req.path === '/webhook') return next();
  cors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL
      : '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })(req, res, next);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/create-checkout-session', checkoutRouter);
app.use('/webhook', webhookRouter);
app.use('/reservation', reservationRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  res.status(err.status || 500).json({ error: err.message || 'Erreur interne' });
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT} — env: ${process.env.NODE_ENV || 'development'}`);
});
