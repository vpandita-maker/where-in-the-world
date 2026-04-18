# 🌍 Where in the World? - CASE 1 SUBMISSION 
### Geography Trivia Leaderboard — REST API + Full Stack Web App

A real-time geography trivia platform with two games, a persistent global leaderboard, live statistics, and a fully documented REST API.

**Live Demo:** https://whereintheworld.up.railway.app
**API Docs:** https://whereintheworld.up.railway.app/docs

---

## Games

### 🔍 Where in the World?
Decode a mystery country from geographic clues. Each extra clue revealed costs 10 points — guess faster to score higher. 5 rounds, 30 seconds each.

### 🏛 Capital City Quiz
Name the capital city of each country. Points scale with speed — the faster you answer, the more you earn. 5 rounds, 30 seconds each.

---

## Scoring System
| Situation | Points |
|---|---|
| Correct on Clue 1 | 100 pts |
| Each extra clue | −10 pts |
| Capital Quiz (instant) | 100 pts |
| Capital Quiz (time-based) | 100 − (elapsed × 2) pts |
| Wrong or timeout | 0 pts |

---

## REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/add` | Add a score to the leaderboard |
| DELETE | `/remove` | Remove an entry by id or username |
| GET | `/leaderboard` | Top 10 scores |
| GET | `/info` | Mean, median, Q1, Q3, std deviation, range |
| GET | `/performance` | Avg/min/max response time per endpoint (persistent) |
| GET | `/history` | Full score history with date and username filtering |

### Example: POST /add
```json
POST /add
{ "username": "Vansh", "score": 280, "rounds_won": 4 }

Response 201:
{ "success": true, "data": { "id": 1, "username": "Vansh", "score": 280 } }
```

### Example: GET /info
```json
{
  "success": true,
  "data": {
    "count": 42,
    "mean": 187.5,
    "median": 190,
    "min": 10,
    "max": 400,
    "q1": 90,
    "q3": 280,
    "std_deviation": 104.9,
    "range": 390
  }
}
```

---

## Tech Stack
| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Database | PostgreSQL (Railway) |
| Frontend | Vanilla HTML/CSS/JS |
| API Docs | Swagger UI (OpenAPI 3.0) |
| Hosting | Railway |
| Schema | REST — stateless, uniform interface, layered architecture |

---

## Architecture
```
Browser (client)
    ↓ HTTP requests
Express Server (server.js)
    ↓ SQL queries
PostgreSQL Database
    ↑ JSON responses
Browser (renders leaderboard, stats, activity feed)
```

---

## Run Locally
```bash
git clone https://github.com/vpandita-maker/where-in-the-world.git
cd where-in-the-world
npm install
DATABASE_URL=your_postgres_url node server.js
# Open http://localhost:8080
```

---

## Validation & Error Handling
- Negative scores rejected with 400 error
- All database queries wrapped in try/catch — server never crashes on DB errors
- Missing fields return descriptive 400 errors
- 404 returned when removing non-existent entries
- Performance metrics persist across server restarts (stored in PostgreSQL)

## Contributors

- Yashna Reddy Pandugala - Sophomore, Finance and Informatics
- Vansh Pandita - Sophomore, Informatics and Accounting
