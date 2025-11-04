const Post = require('models/Post');

exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('user', 'username')
      .sort({ createdAt: -1 });
    res.json({ success: true, posts });
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ success: false, message: 'Error fetching posts' });
  }
};

exports.createPost = async (req, res) => {
  try {
    const { title, content, link, image } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const post = new Post({
      user: req.user._id,
      title,
      content: content || '',
      link: link || null,
      image: image || null,
    });

    await post.save();

    res.status(201).json({ success: true, post });
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ success: false, message: 'Error creating post' });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const { title, content, link, image } = req.body;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    post.title = title || post.title;
    post.content = content || post.content;
    post.link = link || post.link;
    post.image = image || post.image;

    await post.save();

    res.json({ success: true, post });
  } catch (err) {
    console.error('Error updating post:', err);
    res.status(500).json({ success: false, message: 'Error updating post' });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await post.remove();

    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ success: false, message: 'Error deleting post' });
  }
};
