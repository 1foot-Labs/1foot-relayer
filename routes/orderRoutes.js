const express = require('express');
const router = express.Router();
const {
  createOrder,
  viewActiveOrders,
  fulfillOrder
} = require('../controllers/orderController');

router.post('/create-order', createOrder);
router.get('/view-active-orders', viewActiveOrders);
router.post('/fulfill-order', fulfillOrder);

module.exports = router;
