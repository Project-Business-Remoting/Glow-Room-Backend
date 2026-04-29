# Glow Room Hair — Backend

API Node.js/Express pour la gestion des réservations (Interac e-Transfer) + emails.

## Prérequis

- Node.js 18+ LTS
- Un projet Firebase (Firestore activé)
- Un compte SMTP (Gmail, Mailgun, etc.)

## Installation

```bash
npm install
cp .env.example .env
# Remplir toutes les variables dans .env
```

## Variables d'environnement

| Variable                | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| `FIREBASE_PROJECT_ID`   | ID du projet Firebase                                        |
| `FIREBASE_CLIENT_EMAIL` | Email du compte de service Firebase                          |
| `FIREBASE_PRIVATE_KEY`  | Clé privée du compte de service (avec `\n` littéraux)        |
| `EMAIL_HOST`            | Serveur SMTP (ex. `smtp.gmail.com`)                          |
| `EMAIL_PORT`            | Port SMTP (`587` pour TLS, `465` pour SSL)                   |
| `EMAIL_USER`            | Identifiant SMTP                                             |
| `EMAIL_PASS`            | Mot de passe SMTP                                            |
| `EMAIL_FROM`            | Expéditeur affiché                                           |
| `EMAIL_OWNER`           | Email du salon pour les notifications                        |
| `INTERAC_EMAIL`         | Email de réception du dépôt Interac (défaut : `EMAIL_OWNER`) |
| `ADMIN_PASSWORD`        | Mot de passe pour les endpoints admin                        |
| `FRONTEND_URL`          | URL du frontend (`https://glowroom.ca`)                      |
| `PORT`                  | Port du serveur (défaut : `3000`)                            |
| `NODE_ENV`              | `production` ou `development`                                |

## Lancement

```bash
# Production
npm start

# Développement (avec rechargement automatique)
npm run dev
```

## Endpoints

| Méthode | Route                                | Description                                             |
| ------- | ------------------------------------ | ------------------------------------------------------- |
| `GET`   | `/slots-disponibles?date=YYYY-MM-DD` | Renvoie les créneaux indisponibles (réservés + bloqués) |
| `POST`  | `/reservation`                       | Crée une demande de réservation (statut `en_attente`)   |
| `PATCH` | `/reservation/:id/confirmer`         | Confirme (admin) + email client                         |
| `PATCH` | `/reservation/:id/annuler`           | Annule (admin) + email client                           |
| `POST`  | `/bloquer-creneau`                   | Bloque un créneau (admin)                               |
| `GET`   | `/reservation/:id`                   | Récupère une réservation par ID                         |
| `GET`   | `/health`                            | Healthcheck                                             |

## Flux complet (Interac)

1. Le frontend POST `/reservation` avec les infos client + date + créneau
2. Le backend enregistre en Firestore (`status: en_attente`) et envoie :
   - email à la cliente avec instructions Interac
   - email à la propriétaire (notification)
3. La propriétaire confirme le paiement via le dashboard → `PATCH /reservation/:id/confirmer`
4. Le backend passe `status: confirmé` et envoie l’email de confirmation à la cliente

## Déploiement (Render / Railway)

1. Connecter le dépôt GitHub
2. Définir toutes les variables d'environnement dans le dashboard
3. Commande de démarrage : `node server.js`
4. Healthcheck : `GET /health`

> Ne jamais committer le fichier `.env`. Les clés Stripe et Firebase ne doivent exister que dans les variables d'environnement de la plateforme de déploiement.
