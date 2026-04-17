const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const { category, from, to, search } = req.query;
    let query = 'SELECT * FROM logs WHERE user_id = ?';
    const params = [req.user.id];
    if (category) { query += ' AND category = ?'; params.push(category); }
    if (from)     { query += ' AND log_date >= ?'; params.push(from); }
    if (to)       { query += ' AND log_date <= ?'; params.push(to); }
    if (search)   { query += ' AND (title LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY log_date DESC, created_at DESC';
    const logs = db.prepare(query).all(...params);
    res.json({ logs });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
});

router.get('/stats', async (req, res) => {
  try {
    const db = await getDb();
    const totalLogs   = db.prepare('SELECT COUNT(*) as count FROM logs WHERE user_id = ?').get(req.user.id);
    const byCategory  = db.prepare('SELECT category, COUNT(*) as count FROM logs WHERE user_id = ? GROUP BY category').all(req.user.id);
    const lastLog     = db.prepare('SELECT * FROM logs WHERE user_id = ? ORDER BY log_date DESC LIMIT 1').get(req.user.id);
    const thisMonth   = db.prepare("SELECT COUNT(*) as count FROM logs WHERE user_id = ? AND strftime('%Y-%m', log_date) = strftime('%Y-%m', 'now')").get(req.user.id);
    res.json({ total: totalLogs.count, thisMonth: thisMonth.count, byCategory, lastLog: lastLog || null });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const log = db.prepare('SELECT * FROM logs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!log) return res.status(404).json({ error: 'Log not found.' });
    res.json({ log });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const { title, category, description, location, log_date } = req.body;
    if (!title || !category || !log_date)
      return res.status(400).json({ error: 'Title, category and date are required.' });
    const validCategories = ['navigation','maintenance','safety','cargo','crew','weather','other'];
    if (!validCategories.includes(category))
      return res.status(400).json({ error: 'Invalid category.' });
    const result = db.prepare(
      'INSERT INTO logs (user_id, title, category, description, location, log_date) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, title, category, description || null, location || null, log_date);
    const newLog = db.prepare('SELECT * FROM logs WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Log created.', log: newLog });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const existing = db.prepare('SELECT * FROM logs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Log not found.' });
    const { title, category, description, location, log_date } = req.body;
    db.prepare(`UPDATE logs SET title=?, category=?, description=?, location=?, log_date=?, updated_at=datetime('now') WHERE id=? AND user_id=?`)
      .run(title||existing.title, category||existing.category, description!==undefined?description:existing.description, location!==undefined?location:existing.location, log_date||existing.log_date, req.params.id, req.user.id);
    const updated = db.prepare('SELECT * FROM logs WHERE id = ?').get(req.params.id);
    res.json({ message: 'Log updated.', log: updated });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error.' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const existing = db.prepare('SELECT * FROM logs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Log not found.' });
    db.prepare('DELETE FROM logs WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Log deleted.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
