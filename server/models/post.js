const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  content: { type: String, default: '' },
  link: { type: String, default: null },
  image: { type: String, default: null },  // base64 or URL string
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Post', postSchema);
