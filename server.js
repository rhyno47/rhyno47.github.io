// Serve HTML pages
const path = require('path');

// Route to serve register page
app.get('/register', (req, res) => {
    // __dirname gives the root folder of your project
    // We join it with 'public/register.html' to serve the file
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// POST route to handle form submission
app.post('/register', async (req, res) => {
    const { email, password } = req.body; // get form data

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('Email already exists');
        }

        // Hash the password before saving to DB
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user object
        const newUser = new User({ email, password: hashedPassword });

        // Save user to MongoDB
        await newUser.save();

        // Send success response
        res.status(201).send('User registered successfully');

    } catch (err) {
        // Catch errors and send server error response
        res.status(500).send('Server error: ' + err.message);
    }
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Handle login form submission
app.post('/login', async (req, res) => {
    const { email, password } = req.body; // get form data

    try {
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send('Invalid email or password');
        }

        // Compare password with hashed password in DB
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            // Successful login
            res.send('Login successful!');
        } else {
            // Wrong password
            res.status(400).send('Invalid email or password');
        }
    } catch (err) {
        // Server error
        res.status(500).send('Server error: ' + err.message);
    }
});

