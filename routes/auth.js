const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Inscription d'un utilisateur
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hashage du mot de passe avant de le stocker
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            password: hashedPassword
        });

        // Enregistrer l'utilisateur dans la base de données
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ error: 'Error registering user' });
    }
});

// Connexion d'un utilisateur (sans token)
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Comparer le mot de passe fourni avec le mot de passe hashé
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Connexion réussie (sans token)
        res.json({ user: { id: user._id, username: user.username, isConnected: true } });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Error logging in' });
    }
});

router.post('/logout', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        const user = await User.findById(userId);
        if (user) {
            user.isConnected = false;
            user.socketId = null;
            await user.save();

            console.log(`🔴 User ${user.username} logged out`);
        }

        res.json({ message: 'User logged out successfully' });
    } catch (error) {
        console.error('❌ Logout error:', error);
        res.status(500).json({ error: 'Error logging out' });
    }
});

module.exports = router;
