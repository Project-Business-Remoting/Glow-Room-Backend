const { checkSmtpConnection } = require("../services/email");
const { sendTestEmail } = require("../services/email");

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
};
