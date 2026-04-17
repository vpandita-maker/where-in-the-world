const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Track endpoint performance
const performanceLog = {};
function trackPerformance(endpoint, duration) {
  if (!performanceLog[endpoint]) performanceLog[endpoint] = [];
  performanceLog[endpoint].push(duration);
}

// Middleware to measure execution time
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    trackPerformance(req.path, duration);
  });
  next();
});

// ─── POST /add ───────────────────────────────────────────
app.post('/add', (req, res) => {
  const { username, score } = req.body;
  if (!username || score === undefined) {
    return res.status(400).json({ success: false, error: 'username and score are required' });
  }
  const clean = String(username).trim().slice(0, 30);
  const numScore = Number(score);
  if (!clean || isNaN(numScore)) {
    return res.status(400).json({ success: false, error: 'invalid username or score' });
  }
  const result = db.prepare('INSERT INTO scores (username, score) VALUES (?, ?)').run(clean, numScore);
  res.status(201).json({
    success: true,
    message: 'Entry added',
    data: { id: result.lastInsertRowid, username: clean, score: numScore }
  });
});

// ─── DELETE /remove ──────────────────────────────────────
app.delete('/remove', (req, res) => {
  const { id, username } = req.body;
  let result;
  if (id) {
    result = db.prepare('DELETE FROM scores WHERE id = ?').run(id);
  } else if (username) {
    result = db.prepare('DELETE FROM scores WHERE username = ?').run(username);
  } else {
    return res.status(400).json({ success: false, error: 'provide id or username to remove' });
  }
  if (result.changes === 0) return res.status(404).json({ success: false, error: 'Entry not found' });
  res.json({ success: true, message: 'Entry removed' });
});

// ─── GET /leaderboard ────────────────────────────────────
app.get('/leaderboard', (req, res) => {
  const rows = db.prepare('SELECT id, username, score, created_at FROM scores ORDER BY score DESC LIMIT 10').all();
  res.json({ success: true, data: rows });
});

// ─── GET /info ───────────────────────────────────────────
app.get('/info', (req, res) => {
  const rows = db.prepare('SELECT score FROM scores ORDER BY score ASC').all();
  if (rows.length === 0) return res.json({ success: true, data: { message: 'No entries yet', count: 0 } });

  const scores = rows.map(r => r.score);
  const count = scores.length;
  const mean = scores.reduce((a, b) => a + b, 0) / count;
  const mid = Math.floor(count / 2);
  const median = count % 2 === 0 ? (scores[mid - 1] + scores[mid]) / 2 : scores[mid];
  const variance = scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / count;

  res.json({
    success: true,
    data: {
      count,
      mean: round(mean),
      median: round(median),
      min: scores[0],
      max: scores[scores.length - 1],
      q1: round(percentile(scores, 25)),
      q3: round(percentile(scores, 75)),
      std_deviation: round(Math.sqrt(variance)),
      range: scores[scores.length - 1] - scores[0]
    }
  });
});

// ─── GET /performance ────────────────────────────────────
app.get('/performance', (req, res) => {
  const result = {};
  for (const [endpoint, times] of Object.entries(performanceLog)) {
    result[endpoint] = {
      avg_ms: round(times.reduce((a, b) => a + b, 0) / times.length),
      calls: times.length,
      min_ms: Math.min(...times),
      max_ms: Math.max(...times)
    };
  }
  res.json({ success: true, data: result });
});

// ─── GET /history (bonus) ────────────────────────────────
app.get('/history', (req, res) => {
  const { from, to, username } = req.query;
  let query = 'SELECT * FROM scores WHERE 1=1';
  const params = [];
  if (from) { query += ' AND created_at >= ?'; params.push(from); }
  if (to) { query += ' AND created_at <= ?'; params.push(to); }
  if (username) { query += ' AND username = ?'; params.push(username); }
  query += ' ORDER BY created_at DESC';
  res.json({ success: true, data: db.prepare(query).all(...params) });
});

function percentile(sorted, p) {
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}
function round(n) { return Math.round(n * 100) / 100; }

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
