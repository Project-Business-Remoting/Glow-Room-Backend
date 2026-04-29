require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const checkoutRouter = require("./routes/checkout");
const webhookRouter = require("./routes/webhook");
const reservationRouter = require("./routes/reservation");
const contactRouter = require("./routes/contact");
const { getSlotsDisponibles } = require("./controllers/reservationController");

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Trop de tentatives, réessayez dans 15 minutes" },
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Trop de tentatives, réessayez dans une heure" },
});

const app = express();
const PORT = process.env.PORT || 3000;

// /webhook doit recevoir le raw body AVANT express.json()
app.use("/webhook", express.raw({ type: "application/json" }));

app.use(express.json());

// CORS — exclut /webhook qui est appelé par Stripe
// directement (pas un navigateur)
app.use((req, res, next) => {
  if (req.path === "/webhook") return next();
  cors({
    origin:
      process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })(req, res, next);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Alias historique appelé par le frontend
app.get("/slots-disponibles", getSlotsDisponibles);

app.use("/create-checkout-session", checkoutLimiter, checkoutRouter);
app.use("/webhook", webhookRouter);
app.use("/reservation", reservationRouter);
app.use("/contact", contactLimiter, contactRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Route introuvable" });
});

app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message, err.stack);
  const message =
    process.env.NODE_ENV === "production"
      ? "Une erreur est survenue"
      : err.message;
  res.status(err.status || 500).json({ error: message });
});

app.listen(PORT, () => {
  console.log(
    `Serveur démarré sur le port ${PORT} — env: ${process.env.NODE_ENV || "development"}`,
  );
});
