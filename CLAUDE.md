# Glow Room Hair — Backend

## Contexte

Backend Node.js pour le site Glow Room Hair (Ottawa–Gatineau).
Gère uniquement les paiements Stripe, les réservations et les emails.
Projet client réel — ne jamais exposer de clés ou données sensibles.

## Stack technique

- Node.js 18+ LTS
- Express.js 4.x
- Firebase Admin SDK (Firestore)
- Stripe SDK (latest)
- Nodemailer 6.x
- dotenv, cors

## Architecture MVC légère

routes/ → controllers/ → services/
Jamais de logique métier dans les routes.

## API Endpoints

POST /create-checkout-session → crée session Stripe + retourne URL
POST /webhook → reçoit événements Stripe (signature obligatoire)
GET /reservation/:id → récupère une réservation par ID
GET /health → healthcheck Render/Railway

## Sécurité — RÈGLES ABSOLUES

- .env jamais committé (dans .gitignore)
- Webhook TOUJOURS vérifié via stripe.webhooks.constructEvent()
- Aucune réservation créée sans confirmation webhook valide
- CORS accepte uniquement FRONTEND_URL en production
- Données sensibles (email, téléphone) jamais loggées
- Raw body requis pour /webhook (express.raw())

## Variables d'environnement requises

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
EMAIL_FROM=
EMAIL_OWNER=Tinidk17@gmail.com
FRONTEND_URL=https://glowroom.ca
PORT=3000

## Flux Stripe complet

1. Frontend POST /create-checkout-session avec données réservation
2. Backend crée session Stripe avec metadata + success_url + cancel_url
3. Backend retourne { url } au frontend
4. Frontend redirige vers Stripe Checkout
5. Client paie 15$
6. Stripe POST /webhook checkout.session.completed
7. Backend vérifie signature → enregistre en Firestore → envoie emails
8. Client redirigé vers /success

## Politiques salon

- Dépôt : 15$ CAD, non remboursable
- Annulation : préavis 24h
- Retard : grâce 15 min

## Git

- Commits en français
- Format : type(scope): description
- Jamais de push direct sur main
- Branches : feature/_, fix/_

## Déploiement

- Render ou Railway
- Variables d'environnement dans le dashboard (pas de .env en prod)
- Commande start : node server.js
- Healthcheck : GET /health
