const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Multer storage config - store uploads in back-end/uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  }
});
// Ensure uploads directory exists proactively (important for ephemeral deployments)
async function ensureUploadsDir(){
  try{
    const dir = path.join(__dirname, '..', '..', 'uploads');
    await fs.mkdir(dir, { recursive: true });
  }catch(e){
    console.error('[posts] Failed to create uploads dir', e);
  }
}
ensureUploadsDir();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function (req, file, cb) {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image uploads allowed'));
    cb(null, true);
  }
});

// Helper to remove an uploaded file for a given imageUrl (only for local uploads)
async function removeUploadedFile(imageUrl){
  try{
    if(!imageUrl) return;
    // only remove files that are stored under /uploads/<filename>
    const prefix = '/uploads/';
    if(imageUrl.startsWith(prefix)){
      const filename = imageUrl.slice(prefix.length);
      const abs = path.join(__dirname, '..', '..', 'uploads', filename);
      await fs.unlink(abs).catch(err => {
        // file might not exist; log and ignore
        console.warn('Could not remove file', abs, err && err.code);
      });
    }
  }catch(err){
    console.error('removeUploadedFile error', err);
  }
}

// Helper: owner check (only the post owner may edit/delete)
function isOwner(req, post){
  if(!req.user) return false;
  return String(post.author) === String(req.user.id);
}

// GET /api/posts - list recent posts (public)
router.get('/', async (req, res) => {
  try{
    const posts = await Post.find().sort({ createdAt: -1 }).limit(50).lean();
    res.json(posts);
  }catch(e){
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/posts/:id
router.get('/:id', async (req, res) => {
  try{
    const post = await Post.findById(req.params.id).lean();
    if(!post) return res.status(404).json({ message: 'Not found' });
    res.json(post);
  }catch(e){
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/posts - create (any authenticated user)
// Create post: supports optional image upload (multipart/form-data) or JSON body
router.post('/', authenticate, (req, res, next) => {
  // Wrap upload to capture Multer errors distinctly
  upload.single('image')(req, res, function(err){
    if(err){
      console.error('[posts:create] Multer error', err);
      return res.status(400).json({ message: err.message || 'Upload error' });
    }
    next();
  });
}, async (req, res) => {
  const trace = { hasFile: !!req.file, bodyKeys: Object.keys(req.body||{}), user: req.user && req.user.id };
  try{
    const { title, body, link } = req.body || {};
    if(!title || !body){
      console.warn('[posts:create] Validation failed', trace);
      return res.status(400).json({ message: 'Title and body required' });
    }
    let imageUrl = req.body.imageUrl || null;
    if(req.file){
      imageUrl = '/uploads/' + req.file.filename;
      // Verify file was actually written to disk (some hosts have ephemeral or permission issues)
      try{
        const abs = path.join(__dirname, '..', '..', 'uploads', req.file.filename);
        await fs.access(abs);
      }catch(e){
        console.error('[posts:create] Uploaded file missing right after write', { file: req.file.filename, err: e.message });
        // Graceful fallback: treat as no image instead of throwing 500
        imageUrl = null;
      }
    }
    const post = new Post({ title, body, link, imageUrl, author: req.user.id, authorEmail: req.user.email });
    await post.save();
    res.status(201).json(post);
  }catch(e){
    console.error('[posts:create] Server error', { error: e.message, stack: e.stack && e.stack.split('\n').slice(0,4).join(' | '), trace });
    if(e.message && e.message.includes('Only image')) return res.status(400).json({ message: e.message });
    res.status(500).json({ message: 'Server error creating post', detail: e.message, trace });
  }
});

// PUT /api/posts/:id - update (owner-only)
// Update post: supports optional image upload
router.put('/:id', authenticate, upload.single('image'), async (req, res) => {
  try{
    const post = await Post.findById(req.params.id);
    if(!post) return res.status(404).json({ message: 'Not found' });
  // allow only if owner
  if(!isOwner(req, post)) return res.status(403).json({ message: 'Forbidden' });
    ['title','body','link'].forEach(k => { if(req.body[k] !== undefined) post[k] = req.body[k]; });
    if(req.file){
      // if replacing an existing uploaded image, remove the old file
      if(post.imageUrl){ await removeUploadedFile(post.imageUrl); }
      post.imageUrl = '/uploads/' + req.file.filename;
    }else if(req.body.imageUrl !== undefined){
      // if client explicitly cleared image (empty string/null) and there was a previous local upload, remove it
      if((req.body.imageUrl === '' || req.body.imageUrl === null) && post.imageUrl){ await removeUploadedFile(post.imageUrl); post.imageUrl = null; }
      else if(req.body.imageUrl){ post.imageUrl = req.body.imageUrl; }
    }
    await post.save();
    res.json(post);
  }catch(e){
    console.error(e);
    if(e.message && e.message.includes('Only image')) return res.status(400).json({ message: e.message });
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/posts/:id - delete (owner-only)
router.delete('/:id', authenticate, async (req, res) => {
  try{
    const post = await Post.findById(req.params.id);
    if(!post) return res.status(404).json({ message: 'Not found' });
  if(!isOwner(req, post)) return res.status(403).json({ message: 'Forbidden' });
    // if this post had a local uploaded image, try to remove the file
    if(post.imageUrl){ await removeUploadedFile(post.imageUrl); }
    await post.deleteOne();
    res.json({ message: 'Deleted' });
  }catch(e){
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
