const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        score INTEGER NOT NULL,
        rounds_won INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS performance_log (
        id SERIAL PRIMARY KEY,
        endpoint TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('Database ready');
  } catch(e) {
    console.error('DB init error:', e.message);
  }
}
initDB();

// Middleware to measure and persist execution time
app.use(async (req, res, next) => {
  const start = Date.now();
  res.on('finish', async () => {
    const duration = Date.now() - start;
    try {
      await pool.query(
        'INSERT INTO performance_log (endpoint, duration_ms) VALUES ($1, $2)',
        [req.path, duration]
      );
    } catch(e) {}
  });
  next();
});

// ─── POST /add ───────────────────────────────────────────
app.post('/add', async (req, res) => {
  try {
    const { username, score, rounds_won } = req.body;
    if (!username || score === undefined)
      return res.status(400).json({ success: false, error: 'username and score required' });
    const clean = String(username).trim().slice(0, 30);
    const numScore = Number(score);
    const numRounds = Number(rounds_won) || 0;
    if (!clean || isNaN(numScore))
      return res.status(400).json({ success: false, error: 'invalid username or score' });
    if (numScore < 0)
      return res.status(400).json({ success: false, error: 'score must be non-negative' });
    const result = await pool.query(
      'INSERT INTO scores (username, score, rounds_won) VALUES ($1, $2, $3) RETURNING *',
      [clean, numScore, numRounds]
    );
    res.status(201).json({ success: true, message: 'Entry added', data: result.rows[0] });
  } catch(e) {
    console.error('/add error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── DELETE /remove ──────────────────────────────────────
app.delete('/remove', async (req, res) => {
  try {
    const { id, username } = req.body;
    let result;
    if (id) {
      result = await pool.query('DELETE FROM scores WHERE id = $1', [id]);
    } else if (username) {
      result = await pool.query('DELETE FROM scores WHERE username = $1', [username]);
    } else {
      return res.status(400).json({ success: false, error: 'provide id or username' });
    }
    if (result.rowCount === 0)
      return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, message: 'Entry removed' });
  } catch(e) {
    console.error('/remove error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── GET /leaderboard ────────────────────────────────────
app.get('/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, score, rounds_won, created_at FROM scores ORDER BY score DESC LIMIT 10'
    );
    res.json({ success: true, data: result.rows });
  } catch(e) {
    console.error('/leaderboard error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── GET /info ───────────────────────────────────────────
app.get('/info', async (req, res) => {
  try {
    const result = await pool.query('SELECT score FROM scores ORDER BY score ASC');
    const rows = result.rows;
    if (rows.length === 0)
      return res.json({ success: true, data: { message: 'No entries yet', count: 0 } });
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
  } catch(e) {
    console.error('/info error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── GET /performance ────────────────────────────────────
app.get('/performance', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT endpoint,
        ROUND(AVG(duration_ms)::numeric, 2) as avg_ms,
        MIN(duration_ms) as min_ms,
        MAX(duration_ms) as max_ms,
        COUNT(*) as calls
      FROM performance_log
      GROUP BY endpoint
      ORDER BY endpoint
    `);
    const data = {};
    for (const row of result.rows) {
      data[row.endpoint] = {
        avg_ms: parseFloat(row.avg_ms),
        min_ms: parseInt(row.min_ms),
        max_ms: parseInt(row.max_ms),
        calls: parseInt(row.calls)
      };
    }
    res.json({ success: true, data });
  } catch(e) {
    console.error('/performance error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── GET /history ────────────────────────────────────────
app.get('/history', async (req, res) => {
  try {
    const { from, to, username } = req.query;
    let query = 'SELECT * FROM scores WHERE 1=1';
    const params = [];
    if (from) { query += ` AND created_at >= $${params.length + 1}`; params.push(from); }
    if (to) { query += ` AND created_at <= $${params.length + 1}`; params.push(to); }
    if (username) { query += ` AND username = $${params.length + 1}`; params.push(username); }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch(e) {
    console.error('/history error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

function percentile(sorted, p) {
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}
function round(n) { return Math.round(n * 100) / 100; }

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
