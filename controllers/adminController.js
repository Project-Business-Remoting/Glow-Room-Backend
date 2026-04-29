const { checkSmtpConnection } = require("../services/email");

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
};
