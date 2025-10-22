const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express(); // create Express app

// ------------------ MIDDLEWARE ------------------

// Parse URL-encoded form data (from HTML forms)
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS) from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// ------------------ DATABASE ------------------
mongoose.connect('mongodb://localhost:27017/userDB')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));


// ------------------ USER SCHEMA ------------------
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// ------------------ HTML ROUTES ------------------

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
    const { email, password } = req.body;

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('Email already exists');
        }

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create and save user
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();

        res.status(201).send('User registered successfully');

    } catch (err) {
        res.status(500).send('Server error: ' + err.message);
    }
});

// Login existing user
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send('Invalid email or password');
        }

        // Compare password with hashed password in DB
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            res.send('Login successful!');
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
