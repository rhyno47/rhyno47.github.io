const mongoose = require('mongoose');

module.exports = async function connectDB() {
  // Enable mongoose debug to get detailed driver operations in logs while
  // diagnosing connection issues. Disable this in production when finished.
  try {
    mongoose.set('debug', true);
  } catch (e) {
    // ignore if mongoose version doesn't support debug
  }
  const primary = process.env.MONGODB_URI;
  const fallback = process.env.MONGODB_URI_FALLBACK;

  const allowStartWithoutDb = /^true$/i.test(process.env.ALLOW_START_WITHOUT_DB || '');
  if (!primary && !fallback) {
    console.error('MONGODB_URI not set in .env and no MONGODB_URI_FALLBACK provided');
    if (allowStartWithoutDb) {
      console.warn('[DB] ALLOW_START_WITHOUT_DB is true — continuing without database connection');
      return; // allow app to start so /whoami or health endpoints work
    }
    process.exit(1);
  }

  const connectOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // increase timeouts for slow DNS / network during diagnosis
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    family: 4
  };

  async function tryConnect(uri, label) {
    try {
      console.log(`Attempting MongoDB connection (${label})...`);
      await mongoose.connect(uri, connectOptions);
      console.log(`MongoDB connected (${label})`);
      return true;
    } catch (err) {
      console.error(`MongoDB connection (${label}) failed:`);
      // Print full error object and stack for diagnosis
      console.error(err);
      if (err && err.stack) console.error(err.stack);
      return false;
    }
  }

  // Try primary first (SRV). If it fails and a fallback is configured, try fallback.
  if (primary) {
    const ok = await tryConnect(primary, 'primary');
    if (ok) return;
    if (!fallback) {
      console.error('\nPrimary connection failed and no fallback configured. See README troubleshooting.');
      if (allowStartWithoutDb) {
        console.warn('[DB] ALLOW_START_WITHOUT_DB is true — continuing without database connection');
        return;
      }
      process.exit(1);
    }
    console.warn('\nPrimary failed — attempting fallback connection...');
  }

  if (fallback) {
    const ok2 = await tryConnect(fallback, 'fallback');
    if (ok2) return;
    console.error('\nBoth primary and fallback MongoDB connections failed. See README and diagnostics.');
    if (allowStartWithoutDb) {
      console.warn('[DB] ALLOW_START_WITHOUT_DB is true — continuing without database connection');
      return;
    }
    process.exit(1);
  }
};
