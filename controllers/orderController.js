const Order = require('../models/Order');

// Dutch auction parameters
const AUCTION_DECAY_INTERVAL_MIN = 5; // every 5 minutes
const DECAY_PERCENTAGE = 0.02; // 2% decrease per interval

exports.createOrder = async (req, res) => {
  try {
    const { type, makerAddress, hashLock, amountToGive, amountToReceive } = req.body;

    const order = new Order({
      type,
      makerAddress,
      hashLock,
      amountToGive,
      amountToReceive,
      status: 'created'
    });

    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.viewActiveOrders = async (req, res) => {
  try {
    const orders = await Order.find({ status: 'created' });

    const now = new Date();
    const updatedOrders = orders.map(order => {
      const minutesElapsed = Math.floor((now - order.createdAt) / 60000);
      const intervals = Math.floor(minutesElapsed / AUCTION_DECAY_INTERVAL_MIN);
      const decayFactor = Math.pow(1 - DECAY_PERCENTAGE, intervals);
      const decayedAmount = +(order.amountToReceive * decayFactor).toFixed(8);

      return {
        ...order.toObject(),
        amountToReceive: decayedAmount
      };
    });

    res.json(updatedOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.fulfillOrder = async (req, res) => {
  try {
    const { orderId, takerAddress, ethHTLCAddress, btcHTLCAddress } = req.body;

    const order = await Order.findById(orderId);

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'created') return res.status(400).json({ error: 'Order is not available' });

    order.status = 'in-progress';
    order.takerAddress = takerAddress;
    order.ethHTLCAddress = ethHTLCAddress;
    order.btcHTLCAddress = btcHTLCAddress;
    order.updatedAt = new Date();

    await order.save();
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
