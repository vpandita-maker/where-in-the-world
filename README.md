# 🌍 Where in the World?
### Geography Trivia Leaderboard — Case #1 REST API Project

---

## What It Does
- AI generates unique clues one by one for a mystery country
- Players guess using as few clues as possible (fewer clues = more points)
- Scores submit to a REST API backend with SQLite storage
- Live leaderboard shows global rankings

## Tech Stack
| Layer | Tool |
|---|---|
| Frontend | Vanilla HTML/CSS/JS (single file) |
| Backend | Node.js + Express |
| Database | SQLite via better-sqlite3 |
| AI Clues | Anthropic Claude API |

---

## Setup (5 minutes)

### 1. Install dependencies
```bash
npm install
```

### 2. Start the server
```bash
npm start
```
Server runs at `http://localhost:3000`

### 3. Open the game
Visit `http://localhost:3000` in your browser.

> The frontend is served as a static file from the `public/` folder.

---

## REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/leaderboard` | Top 20 scores |
| POST | `/api/scores` | Submit a new score |
| GET | `/api/scores/:id` | Get single score by ID |
| DELETE | `/api/scores/:id` | Delete a score |
| GET | `/api/stats` | Global stats (total players, high score, avg) |

### POST /api/scores — Request Body
```json
{
  "username": "Vansh",
  "score": 280,
  "rounds_won": 4
}
```

### POST /api/scores — Response
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "Vansh",
    "score": 280,
    "rank": 1
  }
}
```

---

## Scoring System
- Each round starts at **100 points**
- Each extra clue revealed costs **−10 points**
- Minimum score per correct answer: **10 points**
- Wrong answer: **0 points**
- 5 rounds total

---

## Project Structure
```
/
├── server.js          ← Express REST API
├── package.json
├── leaderboard.db     ← Auto-created SQLite database
└── public/
    └── index.html     ← Full game frontend
```
