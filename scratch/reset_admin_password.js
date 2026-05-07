// Script de diagnostic et réinitialisation du mot de passe admin
// Usage : node scratch/reset_admin_password.js <nouveau-mot-de-passe>
//
// Ce script est à usage unique pour récupérer l'accès admin
// Ne pas committer avec un vrai mot de passe en argument

require("dotenv").config();
const { db } = require("../services/firebase");
const { hashPassword, verifyPassword } = require("../services/adminConfig");

async function main() {
  const newPassword = process.argv[2];

  // Lire le hash actuel
  const doc = await db.collection("config").doc("admin").get();
  if (doc.exists && doc.data().passwordHash) {
    console.log("Hash actuel trouvé dans Firestore (créé le :", doc.data().updatedAt?.toDate(), ")");
  } else {
    console.log("Aucun hash dans Firestore.");
  }

  if (!newPassword) {
    console.log("\nUsage : node scratch/reset_admin_password.js <nouveau-mot-de-passe>");
    console.log("Exemple : node scratch/reset_admin_password.js MonNouveauMdp2024!");
    process.exit(0);
  }

  if (newPassword.length < 8) {
    console.error("Le mot de passe doit faire au moins 8 caractères.");
    process.exit(1);
  }

  console.log("\nHashage du nouveau mot de passe...");
  const hash = await hashPassword(newPassword);

  // Vérification immédiate
  const valid = await verifyPassword(newPassword, hash);
  if (!valid) {
    console.error("Erreur interne : la vérification du hash a échoué.");
    process.exit(1);
  }

  await db.collection("config").doc("admin").set(
    { passwordHash: hash, updatedAt: new Date() },
    { merge: true }
  );

  console.log("Mot de passe réinitialisé avec succès.");
  console.log("Connecte-toi maintenant avec :", JSON.stringify(newPassword));
}

main().catch(console.error).finally(() => process.exit(0));
