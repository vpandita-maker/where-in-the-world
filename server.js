const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db = new Database('leaderboard.db');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    score INTEGER NOT NULL,
    rounds_won INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// GET /api/leaderboard — top 20 scores
app.get('/api/leaderboard', (req, res) => {
  const rows = db.prepare(`
    SELECT id, username, score, rounds_won, created_at
    FROM scores
    ORDER BY score DESC
    LIMIT 20
  `).all();
  res.json({ success: true, data: rows });
});

// POST /api/scores — submit a new score
app.post('/api/scores', (req, res) => {
  const { username, score, rounds_won } = req.body;
  if (!username || score === undefined) {
    return res.status(400).json({ success: false, error: 'username and score required' });
  }
  const clean = username.trim().slice(0, 20);
  if (!clean) return res.status(400).json({ success: false, error: 'invalid username' });

  const stmt = db.prepare('INSERT INTO scores (username, score, rounds_won) VALUES (?, ?, ?)');
  const result = stmt.run(clean, score, rounds_won || 0);

  // Get rank
  const rank = db.prepare(`
    SELECT COUNT(*) as cnt FROM scores WHERE score > ?
  `).get(score);

  res.status(201).json({
    success: true,
    data: { id: result.lastInsertRowid, username: clean, score, rank: rank.cnt + 1 }
  });
});

// GET /api/scores/:id — get a single score entry
app.get('/api/scores/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM scores WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, data: row });
});

// DELETE /api/scores/:id — remove a score (admin use)
app.delete('/api/scores/:id', (req, res) => {
  const result = db.prepare('DELETE FROM scores WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, message: 'Deleted' });
});

// GET /api/stats — global stats
app.get('/api/stats', (req, res) => {
  const stats = db.prepare(`
    SELECT COUNT(*) as total_players, MAX(score) as high_score, AVG(score) as avg_score
    FROM scores
  `).get();
  res.json({ success: true, data: stats });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌍 Where in the World server running on http://localhost:${PORT}`));
