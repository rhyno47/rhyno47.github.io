const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  link: { type: String },
  imageUrl: { type: String },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // denormalized author email to make post ownership and UI badges simple
  authorEmail: { type: String, lowercase: true },
  // feature flag to differentiate special posts
  featured: { type: Boolean, default: false }
}, { timestamps: true });

// TTL index: documents expire 7 days (604800 seconds) after `createdAt`
PostSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

module.exports = mongoose.model('Post', PostSchema);
