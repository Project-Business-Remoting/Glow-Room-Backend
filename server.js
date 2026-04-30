require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const reservationRouter = require("./routes/reservation");
const contactRouter = require("./routes/contact");
const blockedSlotsRouter = require("./routes/blockedSlots");
const adminRouter = require("./routes/admin");
const { getSlotsDisponibles } = require("./controllers/reservationController");

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5,
  message: { error: "Trop de tentatives, réessayez dans une heure" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Max 10 réservations par IP par heure — empêche les bots de bloquer tous les créneaux
const reservationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10,
  message: { error: "Trop de demandes de réservation. Réessayez dans une heure." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 60 vérifications de disponibilité par 5 minutes (navigation dans le calendrier)
const slotsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  message: { error: "Trop de requêtes. Attendez quelques minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  cors({
    origin:
      process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "*",
    methods: ["GET", "POST", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Password"],
  })(req, res, next);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Alias historique appelé par le frontend
app.get("/slots-disponibles", slotsLimiter, getSlotsDisponibles);

app.use("/reservation", reservationLimiter, reservationRouter);
app.use("/bloquer-creneau", blockedSlotsRouter);
app.use("/admin", adminRouter);
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Serveur démarré sur le port ${PORT} — env: ${process.env.NODE_ENV || "development"}`,
  );
});
