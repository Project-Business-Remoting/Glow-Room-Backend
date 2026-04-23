const express = require('express');
const { createCheckoutSession } = require('../controllers/checkoutController');
const { validateCheckout } = require('../middlewares/validateCheckout');

const router = express.Router();

router.post('/', validateCheckout, createCheckoutSession);

module.exports = router;
