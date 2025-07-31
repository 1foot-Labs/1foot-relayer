require('dotenv').config();
const mongoose = require('mongoose');
const { runResolver } = require('../services/resolver');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'swap' });
    console.log('[+] Connected to DB');

    await runResolver();

    await mongoose.disconnect();
    console.log('[✓] Resolver run completed');
  } catch (err) {
    console.error('[x] Resolver error:', err);
    process.exit(1);
  }
})();
