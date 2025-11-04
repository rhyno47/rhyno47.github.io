const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getPosts,
  createPost,
  updatePost,
  deletePost
} = require('../controllers/postController');

router.get('/', getPosts);              // Public: list all posts
router.post('/', protect, createPost); // Authenticated users create post
router.put('/:id', protect, updatePost);// Authenticated users update own post
router.delete('/:id', protect, deletePost);// Authenticated users delete own post

module.exports = router;
