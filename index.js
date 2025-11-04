require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

// ------------------ MIDDLEWARE ------------------
// Parse URL-encoded form data from HTML forms and JSON bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Enable CORS so pages served from other origins can call the API (adjust origin in production)
app.use(cors());
// Serve static files (HTML, CSS, JS) from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// ------------------ DATABASE ------------------//

const MONGO = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'please_change_this_secret';

if (!MONGO) {
  console.error('❌ MONGO_URI is not defined in .env file');
  process.exit(1);
}

mongoose.connect(MONGO)
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});


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
  try {
    console.log('Received registration request');
    
    // Validate request body
    if (!req.body) {
      return res.status(400).json({ error: 'No request body received' });
    }

    const { username, email, password, confirmPassword } = req.body;
    console.log('Validating fields:', { username: !!username, email: !!email, hasPassword: !!password });
    
    // Validate required fields
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: { username: !!username, email: !!email, password: !!password, confirmPassword: !!confirmPassword }
      });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      console.log('Password mismatch');
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    console.log('Checking for existing user...');
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists');
      return res.status(400).json({ error: 'Email already exists' });
    }

    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('Creating new user...');
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });

    console.log('Saving user to database...');
    await newUser.save();
    console.log('User saved successfully');

    // create JWT token
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Sending success response...');
    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: Object.values(err.errors).map(e => e.message)
      });
    } else if (err.code === 11000) {
      return res.status(400).json({
        error: 'Email already exists'
      });
    } else {
      console.error('Unexpected error:', err);
      return res.status(500).json({
        error: 'Registration failed',
        message: 'An unexpected error occurred'
      });
    }
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
      const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      // If AJAX request, return JSON
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
      }
      // fallback: send simple message
      res.send(`Login successful! Welcome ${user.username}`);
    } else {
      res.status(400).json({ error: 'Invalid email or password' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ------------------ START SERVER ------------------
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));



// ------------------- AI CHAT ROUTE -------------------//
const axios = require('axios');

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: message }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const aiReply = response.data.choices[0].message.content;
    res.json({ reply: aiReply });
  } catch (error) {
    console.error('AI Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'AI request failed' });
  }
});
