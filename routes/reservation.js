const express = require('express');
const { getReservation } = require('../controllers/reservationController');

const router = express.Router();

router.get('/:id', getReservation);

module.exports = router;
