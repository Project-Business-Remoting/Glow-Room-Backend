
const { deleteCancelledReservations } = require('../services/reservationModel');

async function test() {
  try {
    console.log("Starting trash cleanup test...");
    const count = await deleteCancelledReservations();
    console.log("Deleted count:", count);
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

test();
