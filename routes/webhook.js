const express = require('express');
const { handleWebhook } = require('../controllers/webhookController');

const router = express.Router();

// Le raw body est déjà appliqué dans server.js avant ce router
router.post('/', handleWebhook);

module.exports = router;
