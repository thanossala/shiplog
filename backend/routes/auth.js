const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');
const authMiddleware = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const db = await getDb();
    const { username, email, password, vessel_name, rank } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'Username, email and password are required.' });
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (existing)
      return res.status(409).json({ error: 'Username or email already in use.' });
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (username, email, password, vessel_name, rank) VALUES (?, ?, ?, ?, ?)'
    ).run(username, email, hashedPassword, vessel_name || null, rank || null);
    const token = jwt.sign({ id: result.lastInsertRowid, username, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'User registered successfully.', token, user: { id: result.lastInsertRowid, username, email, vessel_name, rank } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
});

router.post('/login', async (req, res) => {
  try {
    const db = await getDb();
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Invalid credentials.' });
    const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login successful.', token, user: { id: user.id, username: user.username, email: user.email, vessel_name: user.vessel_name, rank: user.rank } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const user = db.prepare('SELECT id, username, email, vessel_name, rank, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
