const crypto = require("crypto");
const { db } = require("./firebase");

const CONFIG_DOC = db.collection("config").doc("admin");
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
const SCRYPT_KEYLEN = 64;
const CACHE_TTL_MS = 5 * 60 * 1000;

let _cache = null;
let _cacheExpiry = 0;

async function getPasswordHash() {
  const now = Date.now();
  if (_cache !== null && now < _cacheExpiry) return _cache;

  const doc = await CONFIG_DOC.get();
  const hash =
    doc.exists && doc.data().passwordHash ? doc.data().passwordHash : null;

  _cache = hash;
  _cacheExpiry = now + CACHE_TTL_MS;
  return hash;
}

async function setPasswordHash(hash) {
  await CONFIG_DOC.set({ passwordHash: hash, updatedAt: new Date() }, { merge: true });
  _cache = hash;
  _cacheExpiry = Date.now() + CACHE_TTL_MS;
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS, (err, key) => {
      if (err) reject(err);
      else resolve(`${salt}:${key.toString("hex")}`);
    });
  });
}

function verifyPassword(password, storedHash) {
  return new Promise((resolve, reject) => {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return resolve(false);
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS, (err, key) => {
      if (err) reject(err);
      else {
        const hashBuf = Buffer.from(hash, "hex");
        if (key.length !== hashBuf.length) return resolve(false);
        resolve(crypto.timingSafeEqual(key, hashBuf));
      }
    });
  });
}

// Retourne true/false si configuré, null si pas de mot de passe configuré du tout.
async function verifyAdminPassword(provided) {
  const storedHash = await getPasswordHash();

  if (storedHash) {
    return verifyPassword(provided, storedHash);
  }

  // Fallback legacy : env var pendant la période de migration
  const envPassword = process.env.ADMIN_PASSWORD;
  if (!envPassword) return null;

  const expectedBuf = Buffer.from(envPassword);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

// À appeler au démarrage : migre ADMIN_PASSWORD vers Firestore si pas encore fait.
async function migrateFromEnvIfNeeded() {
  const existing = await getPasswordHash();
  if (existing) return;

  const envPassword = process.env.ADMIN_PASSWORD;
  if (!envPassword) return;

  const hash = await hashPassword(envPassword);
  await setPasswordHash(hash);
  console.log(
    "[adminConfig] ADMIN_PASSWORD migré vers Firestore — la variable d'env peut être supprimée après vérification"
  );
}

module.exports = {
  hashPassword,
  verifyPassword,
  verifyAdminPassword,
  getPasswordHash,
  setPasswordHash,
  migrateFromEnvIfNeeded,
};
