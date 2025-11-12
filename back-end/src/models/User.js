const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  emailVerified: { type: Boolean, default: false },
  emailVerificationSentAt: { type: Date },
  emailVerificationTokenId: { type: String } // short identifier to correlate logs / invalidations
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
