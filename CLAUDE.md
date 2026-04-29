# Glow Room Hair — Backend

## Contexte

Backend Node.js pour le site Glow Room Hair (Ottawa–Gatineau).
Gère les réservations (Interac e-Transfer) et les emails.
Projet client réel — ne jamais exposer de clés ou données sensibles.

## Stack technique

- Node.js 18+ LTS
- Express.js 4.x
- Firebase Admin SDK (Firestore)
- Nodemailer 6.x
- dotenv, cors

## Architecture MVC légère

routes/ → controllers/ → services/
Jamais de logique métier dans les routes.

## API Endpoints

GET /slots-disponibles?date=YYYY-MM-DD → créneaux indisponibles (réservés + bloqués)
POST /reservation → crée une demande (status: en_attente)
PATCH /reservation/:id/confirmer → confirme (admin)
PATCH /reservation/:id/annuler → annule (admin)
POST /bloquer-creneau → bloque un créneau (admin)
GET /reservation/:id → récupère une réservation par ID
GET /health → healthcheck Render/Railway

## Sécurité — RÈGLES ABSOLUES

- .env jamais committé (dans .gitignore)
- Les endpoints admin exigent `ADMIN_PASSWORD` (Authorization Bearer ou header `X-Admin-Password`)
- CORS accepte uniquement FRONTEND_URL en production
- Données sensibles (email, téléphone) jamais loggées

## Variables d'environnement requises

ADMIN_PASSWORD=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
EMAIL_FROM=
EMAIL_OWNER=Tinidk17@gmail.com
INTERAC_EMAIL=
FRONTEND_URL=https://glowroom.ca
PORT=3000

## Flux Interac

1. Frontend POST /reservation
2. Backend enregistre la demande (`en_attente`) + envoie email instructions Interac à la cliente
3. Propriétaire confirme via dashboard → PATCH /reservation/:id/confirmer
4. Backend passe `confirmé` + envoie email de confirmation à la cliente

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
