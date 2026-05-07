const { checkSmtpConnection, sendTestEmail } = require("../services/email");
const { hashPassword, setPasswordHash } = require("../services/adminConfig");

async function getSmtpStatus(req, res, next) {
  try {
    const status = await checkSmtpConnection();
    res.json({ smtp: status });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSmtpStatus,
  async testEmail(req, res, next) {
    try {
      await sendTestEmail();
      res.json({ ok: true });
    } catch (err) {
      // 502 : backend ok, mais provider email KO
      err.status = 502;
      next(err);
    }
  },
  async changePassword(req, res, next) {
    try {
      const { newPassword } = req.body;
      if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
        return res
          .status(400)
          .json({ error: "Le nouveau mot de passe doit faire au moins 8 caractères" });
      }
      const hash = await hashPassword(newPassword);
      await setPasswordHash(hash);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
};
