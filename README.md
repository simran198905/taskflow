# TaskFlow — Scalable REST API with Auth & RBAC

A production-ready backend API with JWT authentication, role-based access control, and CRUD operations for tasks, paired with a React frontend dashboard.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | express-validator |
| Docs | Swagger / OpenAPI 3.0 |
| Security | Helmet, CORS, express-rate-limit |
| Logging | Winston + Morgan |
| Frontend | React.js (Create React App) |

---

## Project Structure

```
taskflow/
├── backend/
│   ├── src/
│   │   ├── config/         # DB connection, Swagger config
│   │   ├── controllers/    # Business logic (auth, tasks)
│   │   ├── middleware/     # JWT auth, RBAC, validation, error handler
│   │   ├── models/         # Mongoose schemas (User, Task)
│   │   ├── routes/         # Express routers with JSDoc annotations
│   │   └── utils/          # Logger, API response helpers
│   └── server.js
└── frontend/
    └── src/
        ├── context/        # React Auth context (JWT state)
        ├── utils/          # Axios instance + API functions
        └── App.js          # Full SPA: login, dashboard, CRUD, admin
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Backend Setup

```bash
cd backend
cp .env.example .env          # Fill in your MongoDB URI and JWT secret
npm install
npm run dev                   # Starts on http://localhost:5000
```

### Frontend Setup

```bash
cd frontend
npm install
npm start                     # Starts on http://localhost:3000
```

### API Docs (Swagger)
Open http://localhost:5000/api/docs after starting the backend.

---

## API Endpoints (v1)

### Auth — `/api/v1/auth`
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/register` | Public | Register user |
| POST | `/login` | Public | Login, returns JWT |
| GET | `/me` | Private | Get own profile |
| PUT | `/me` | Private | Update profile |

### Tasks — `/api/v1/tasks`
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/` | Private | List tasks (paginated, filterable) |
| POST | `/` | Private | Create task |
| GET | `/:id` | Private | Get single task |
| PUT | `/:id` | Private | Update task |
| DELETE | `/:id` | Private | Delete task |

### Admin — `/api/v1/tasks/admin`
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/users` | Admin | List all users |
| DELETE | `/users/:id` | Admin | Remove user + their tasks |
| GET | `/stats` | Admin | Platform statistics |

---

## Security Measures

- **Password hashing** — bcrypt with salt rounds = 12
- **JWT** — signed with secret, 7-day expiry, verified on every private route
- **Role-based access** — middleware enforces `user` vs `admin` roles
- **Input sanitization** — express-validator on all inputs
- **Rate limiting** — 100 req/15min globally; 15 req/15min on auth routes
- **Helmet** — sets secure HTTP headers
- **CORS** — restricted to configured origin
- **Request size limit** — JSON body capped at 10kb

---

## Database Schema

### User
```
{ name, email (unique), password (hashed), role: [user|admin], isActive, lastLogin, timestamps }
```

### Task
```
{ title, description, status: [todo|in-progress|completed], priority: [low|medium|high],
  dueDate, tags[], owner → User ref, timestamps }
Indexes: (owner, status), (owner, createdAt)
Virtual: isOverdue
```

---

## Scalability Notes

See [SCALABILITY.md](./SCALABILITY.md) for the full architectural breakdown.

**TL;DR:**
- Stateless JWT → horizontal scaling ready
- MongoDB indexes on hot query paths
- Modular route/controller pattern → easy to split into microservices
- Winston structured logging → drop-in ELK/Datadog integration
- Redis caching layer placeholder in config
- Docker-ready (add Dockerfile + docker-compose.yml)
