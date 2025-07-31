const Order = require('../models/Order');
const ethers = require('ethers');
const BitcoinCore = require('bitcoin-core');

const ETH_HTLC_ABI = require('../abis/EthHTLC.json');
const provider = new ethers.providers.JsonRpcProvider(process.env.ETH_RPC_URL);
const ethWallet = new ethers.Wallet(process.env.RESOLVER_PRIVATE_KEY, provider);

const btcClient = new BitcoinCore({
  network: 'testnet',
  username: process.env.BTC_RPC_USER,
  password: process.env.BTC_RPC_PASSWORD,
  host: process.env.BTC_RPC_HOST,
  port: process.env.BTC_RPC_PORT
});

// Internal method: Check HTLC balances and update order
async function checkAndUpdateHTLCStatus(order) {
  let fundedEth = false;
  let fundedBtc = false;

  if (order.ethHTLCAddress) {
    const htlc = new ethers.Contract(order.ethHTLCAddress, ETH_HTLC_ABI, provider);
    const balance = await provider.getBalance(order.ethHTLCAddress);
    fundedEth = balance.gte(ethers.utils.parseEther(order.amountToGive.toString()));
  }

  if (order.btcHTLCAddress) {
    const txs = await btcClient.listTransactions('*', 100);
    const htlcTx = txs.find(tx =>
      tx.address === order.btcHTLCAddress &&
      Math.abs(tx.amount) >= parseFloat(order.amountToGive)
    );
    fundedBtc = !!htlcTx;
  }

  if (fundedEth && fundedBtc) {
    order.status = 'htlc_funded';
    await order.save();
    console.log(`Order ${order._id} is now ready to claim`);
  }
}

// Background job: run periodically
exports.runResolver = async () => {
  const activeOrders = await Order.find({ status: 'htlc_initialised' });

  for (const order of activeOrders) {
    try {
      await checkAndUpdateHTLCStatus(order);
    } catch (err) {
      console.error(`Error processing order ${order._id}:`, err.message);
    }
  }
};

// Claim Funds (resolver claims for user)
exports.claimFunds = async (req, res) => {
  try {
    const { orderId, secret } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'htlc_funded') return res.status(400).json({ error: 'Order not ready to claim' });

    // ETH side claim
    if (order.type === 'btc_eth') {
      const htlc = new ethers.Contract(order.ethHTLCAddress, ETH_HTLC_ABI, ethWallet);
      const tx = await htlc.claim(secret);
      await tx.wait();
    }

    // BTC side claim (pseudo-code, as BTC HTLC claims depend on scripts)
    if (order.type === 'eth_btc') {
      // Here you'd build and broadcast a BTC transaction using the secret
      // Placeholder:
      await btcClient.sendToAddress(order.takerAddress, order.amountToReceive); // Simulated
    }

    order.status = 'funds_claimed';
    await order.save();
    return res.json({ success: true, txHash: tx?.hash || 'btc-tx-placeholder' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
