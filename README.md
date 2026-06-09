# ⚓ ShipLog — Crew Activity Tracker

A full-stack web application for logging crew activities, built as a portfolio project.

## Tech Stack

| Layer    | Technology             |
|----------|------------------------|
| Frontend | HTML + CSS + Vanilla JS |
| Backend  | Node.js + Express      |
| Database | SQLite (better-sqlite3)|
| Auth     | JWT (JSON Web Tokens)  |
| Charts   | Chart.js               |

## Features

- ✅ Register / Login with JWT authentication
- ✅ Dashboard with stats and doughnut chart
- ✅ Full CRUD for log entries
- ✅ 7 log categories (navigation, maintenance, safety, cargo, crew, weather, other)
- ✅ Filter by category + search
- ✅ Responsive design (dark nautical theme)

## REST API Endpoints

### Auth
| Method | Endpoint             | Description        | Auth Required |
|--------|---------------------|--------------------|---------------|
| POST   | /api/auth/register  | Register new user  | No            |
| POST   | /api/auth/login     | Login              | No            |
| GET    | /api/auth/me        | Get current user   | Yes           |

### Logs
| Method | Endpoint         | Description              | Auth Required |
|--------|-----------------|--------------------------|---------------|
| GET    | /api/logs       | Get all logs (+ filters) | Yes           |
| GET    | /api/logs/stats | Get dashboard stats      | Yes           |
| GET    | /api/logs/:id   | Get single log           | Yes           |
| POST   | /api/logs       | Create new log           | Yes           |
| PUT    | /api/logs/:id   | Update log               | Yes           |
| DELETE | /api/logs/:id   | Delete log               | Yes           |

## Setup & Run

```bash
# 1. Go to backend folder
cd backend

# 2. Install dependencies
npm install

# 3. Start the server
npm run dev      # development (with nodemon)
# OR
npm start        # production

# 4. Open in browser
# http://localhost:3000
```

## Project Structure

```
shiplog/
├── backend/
│   ├── db/
│   │   └── database.js       # SQLite setup & tables
│   ├── middleware/
│   │   └── auth.js           # JWT middleware
│   ├── routes/
│   │   ├── auth.js           # /api/auth routes
│   │   └── logs.js           # /api/logs routes
│   ├── .env                  # Environment variables
│   ├── package.json
│   └── server.js             # Entry point
└── frontend/
    ├── css/
    │   └── style.css
    ├── js/
    │   └── app.js
    └── pages/
        └── index.html
```

## Author

**Athanasios Salagiannis** — CS Student @ Metropolitan College Athens  
[GitHub](https://github.com/thanossala) | [Portfolio](https://thanossala.github.io)
