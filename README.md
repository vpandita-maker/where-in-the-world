# 🌍 Where in the World?

A geography trivia leaderboard system built with Node.js, Express, and PostgreSQL.

## Live Demo
- **Game:** https://whereintheworld.up.railway.app
- **API Docs:** https://whereintheworld.up.railway.app/docs

## API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | /add | Add a score to the leaderboard |
| DELETE | /remove | Remove an entry |
| GET | /leaderboard | Top 10 scores |
| GET | /info | Mean, median, quartiles, std deviation |
| GET | /performance | Avg endpoint response time |
| GET | /history | Full score history with filtering |

## Tech Stack
- Node.js + Express
- PostgreSQL (Railway)
- Vanilla HTML/CSS/JS frontend
- Swagger UI for API documentation

## Run Locally
```bash
npm install
node server.js
```
