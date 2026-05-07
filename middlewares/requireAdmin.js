const { verifyAdminPassword } = require("../services/adminConfig");

async function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ")
      ? header.slice("Bearer ".length).trim()
      : "";
    const alt = req.headers["x-admin-password"]
      ? String(req.headers["x-admin-password"]).trim()
      : "";

    const provided = token || alt;
    if (!provided) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    const result = await verifyAdminPassword(provided);
    if (result === null) {
      return res.status(500).json({ error: "Mot de passe admin non configuré" });
    }
    if (!result) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAdmin };
