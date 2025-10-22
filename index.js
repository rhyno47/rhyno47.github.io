const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();

// ------------------ MIDDLEWARE ------------------
// Parse URL-encoded form data from HTML forms
app.use(bodyParser.urlencoded({ extended: true }));
// Serve static files (HTML, CSS, JS) from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// ------------------ DATABASE ------------------//

mongoose.connect('mongodb+srv://dbrhyno:CallMeMath.@cluster0.yuqc1e7.mongodb.net/userDB?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));


// ------------------ USER SCHEMA ------------------
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// ------------------ ROUTES ------------------

// Redirect root to login page
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Serve Register page
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Serve Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ------------------ POST ROUTES ------------------

// Register new user
app.post('/register', async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  // Check if passwords match
  if (password !== confirmPassword) {
    return res.status(400).send('Passwords do not match');
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).send('Email already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });
    await newUser.save();

    res.redirect('/login'); // redirect to login page
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error: ' + err.message);
  }
});


// Login existing user
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send('Invalid email or password');

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      res.send(`Login successful! Welcome ${user.username}`);
    } else {
      res.status(400).send('Invalid email or password');
    }
  } catch (err) {
    res.status(500).send('Server error: ' + err.message);
  }
});

// ------------------ START SERVER ------------------
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
