function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return res.status(500).json({ error: "ADMIN_PASSWORD non configuré" });
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : "";
  const alt = req.headers["x-admin-password"]
    ? String(req.headers["x-admin-password"]).trim()
    : "";

  const provided = token || alt;
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  next();
}

module.exports = { requireAdmin };
