const express = require('express');
const router = express.Router();
const { handleContact } = require('../controllers/contactController');

router.post('/', handleContact);

module.exports = router;
