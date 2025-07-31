const express = require('express');
const cors = require('cors');

const router = express.Router();
const orderController = require('../controllers/orderController');

router.post('/create-order', orderController.createOrder);
router.get('/active-orders', orderController.viewActiveOrders);
router.post('/fulfill-order', orderController.fulfillOrder);

router.get('/source-escrow/:orderId', orderController.getSourceEscrow);
router.get('/order-funded/:orderId', orderController.getStatus);
router.post('/claim', orderController.claimFunds);

module.exports = router;
