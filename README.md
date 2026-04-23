# Glow Room Hair — Backend

API Node.js/Express pour la gestion des réservations avec dépôt Stripe.

## Prérequis

- Node.js 18+ LTS
- Un projet Firebase (Firestore activé)
- Un compte Stripe (clés API + webhook)
- Un compte SMTP (Gmail, Mailgun, etc.)

## Installation

```bash
npm install
cp .env.example .env
# Remplir toutes les variables dans .env
```

## Variables d'environnement

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (`sk_live_...` ou `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Secret du webhook Stripe (`whsec_...`) |
| `FIREBASE_PROJECT_ID` | ID du projet Firebase |
| `FIREBASE_CLIENT_EMAIL` | Email du compte de service Firebase |
| `FIREBASE_PRIVATE_KEY` | Clé privée du compte de service (avec `\n` littéraux) |
| `EMAIL_HOST` | Serveur SMTP (ex. `smtp.gmail.com`) |
| `EMAIL_PORT` | Port SMTP (`587` pour TLS, `465` pour SSL) |
| `EMAIL_USER` | Identifiant SMTP |
| `EMAIL_PASS` | Mot de passe SMTP |
| `EMAIL_FROM` | Expéditeur affiché |
| `EMAIL_OWNER` | Email du salon pour les notifications |
| `FRONTEND_URL` | URL du frontend (`https://glowroom.ca`) |
| `PORT` | Port du serveur (défaut : `3000`) |
| `NODE_ENV` | `production` ou `development` |

## Lancement

```bash
# Production
npm start

# Développement (avec rechargement automatique)
npm run dev
```

## Endpoints

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/create-checkout-session` | Crée une session Stripe Checkout |
| `POST` | `/webhook` | Reçoit les événements Stripe |
| `GET` | `/reservation/:id` | Récupère une réservation par ID |
| `GET` | `/health` | Healthcheck |

### POST /create-checkout-session

**Body JSON :**
```json
{
  "clientName": "Marie Dupont",
  "service": "Tresses box braids",
  "date": "2024-06-15",
  "time": "10:00"
}
```

**Réponse :**
```json
{ "url": "https://checkout.stripe.com/pay/..." }
```

## Flux complet

1. Le frontend POST `/create-checkout-session` avec les données de réservation
2. Le backend crée une session Stripe et retourne `{ url }`
3. Le frontend redirige le client vers l'URL Stripe
4. Le client paie 15 $
5. Stripe POST `/webhook` avec l'événement `checkout.session.completed`
6. Le backend vérifie la signature → enregistre en Firestore → envoie les emails
7. Le client est redirigé vers `/success`

## Configuration du webhook Stripe

Dans le dashboard Stripe → Webhooks → Ajouter un endpoint :
- URL : `https://votre-domaine.com/webhook`
- Événement à écouter : `checkout.session.completed`

Pour les tests en local :
```bash
stripe listen --forward-to localhost:3000/webhook
```

## Déploiement (Render / Railway)

1. Connecter le dépôt GitHub
2. Définir toutes les variables d'environnement dans le dashboard
3. Commande de démarrage : `node server.js`
4. Healthcheck : `GET /health`

> Ne jamais committer le fichier `.env`. Les clés Stripe et Firebase ne doivent exister que dans les variables d'environnement de la plateforme de déploiement.
