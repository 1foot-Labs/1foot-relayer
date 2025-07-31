const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  type: { type: String, enum: ['eth_btc', 'btc_eth'], required: true },
  takerAddress: String,
  makerAddress: { type: String, required: true },
  hashLock: { type: String, required: true },
  status: { type: String, enum: ['created', 'in-progress', 'finished', 'expired'], default: 'created' },
  amountToGive: Number,
  ethHTLCAddress: String,
  btcHTLCAddress: String,
  amountToReceive: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
