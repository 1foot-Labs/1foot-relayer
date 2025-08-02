const Order = require('../models/Order');

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const { type, makerEthAddress, pubKey, sha256, amountToGive, amountToReceive } = req.body;

    const order = new Order({
      type,
      makerEthAddress,
      pubKey,
      sha256,
      amountToGive,
      amountToReceive,
      status: 'order_created'
    });

    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// View orders that are not finished or expired
exports.viewActiveOrders = async (req, res) => {
  try {
    const orders = await Order.find({ status: 'order_created'});
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// FulFill Order (e.g., taker accepts the order)
exports.fulfillOrder = async (req, res) => {
  try {
    const { orderId, takerAddress, ethHTLCAddress, btcHTLCAddress } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'order_created') return res.status(400).json({ error: 'Order is not available for HTLC init' });

    order.takerAddress = takerAddress;
    order.ethHTLCAddress = ethHTLCAddress;
    order.btcHTLCAddress = btcHTLCAddress;
    // order.status = 'htlc_initialised';
    order.status = 'htlc_funded';
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getSourceEscrow =  async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Determine the sourceEscrowAddress based on the direction
    const sourceEscrowAddress =
      order.swapDirection === 'eth-to-btc'
        ? order.ethHTLCAddress
        : order.btcHTLCAddress;
    
    const amount = order.amountToGive

    res.json({ sourceEscrowAddress, amount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getStatus = async (req, res) => {
   const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const funded = order.status === 'htlc_funded';
    res.json({ funded });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Claim funds using the secret (done by resolver)
exports.claimFunds = async (req, res) => {
  try {
    const { orderId, secret } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.status !== 'htlc_funded') {
      return res.status(400).json({ error: 'HTLCs are not funded yet' });
    }

    // Check secret matches hashLock (on-chain HTLC should also verify this)
    const crypto = require('crypto');
    const calculatedHash = crypto.createHash('sha256').update(secret).digest('hex');

    // Compare with stored hashLock
    if (calculatedHash !== order.hashLock) {
      return res.status(400).json({ error: 'Invalid secret' });
    }

    // Trigger on-chain claim logic here
    const result = await require('../services/resolver').claimFunds(order, secret);
    if (!result.success) {
      return res.status(500).json({ error: 'Failed to claim funds on-chain' });
    }

    order.status = 'funds_claimed';
    await order.save();

    res.json({ message: 'Funds successfully claimed', order });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
