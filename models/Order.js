const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  type: { type: String, enum: ['eth_btc', 'btc_eth'], required: true },
  takerAddress: String,
  makerEthAddress: { type: String, required: true },
  pubKey: { type: String, required: true },
  hash160: { type: String, required: true },
  sha3: { type: String, required: true },
  status: { type: String, enum: ['order_created', 'htlc_initialised','htlc_funded','funds_claimed', 'expired'] },
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
