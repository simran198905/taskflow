# Scalability & Deployment Architecture

## Current Design Decisions (Scalability-first)

### 1. Stateless Authentication
JWT tokens are verified client-side (no session store). This means any number of API server instances can handle any request — **horizontal scaling requires zero coordination**.

### 2. Database Indexing
```js
taskSchema.index({ owner: 1, status: 1 });    // filters tasks by owner + status
taskSchema.index({ owner: 1, createdAt: -1 }); // sorts for dashboard
```
These compound indexes turn full-collection scans into O(log n) lookups as the task count grows.

### 3. Pagination
All list endpoints use `skip/limit` pagination. Cursor-based pagination (using `_id`) should be adopted at scale to avoid skip cost on large collections.

### 4. Modular Architecture
Routes → Controllers → Models are strictly separated. Each module (auth, tasks, admin) can be extracted into a standalone microservice with its own process and database, connected via a message queue (RabbitMQ/Kafka) or an API gateway (Kong/Nginx).

---

## Scaling Roadmap

### Phase 1 — Vertical + Basic Horizontal
- **Docker**: Containerise backend and frontend. Add `Dockerfile` + `docker-compose.yml` for local parity with prod.
- **Environment separation**: `.env.development`, `.env.production` via dotenv-flow.
- **Process manager**: PM2 cluster mode to use all CPU cores on a single server.

### Phase 2 — Caching Layer (Redis)
```
Client → Express API → Redis cache (TTL 60s) → MongoDB
```
Cache hot reads: user profiles, task counts, admin stats. Invalidate on write. Estimated 10x read throughput improvement for repeated queries.

```js
// Pattern already stubbed in config/
const cache = require('./config/redis');
const CACHE_TTL = 60;

const getTasks = async (req, res) => {
  const key = `tasks:${req.user._id}:${JSON.stringify(req.query)}`;
  const cached = await cache.get(key);
  if (cached) return success(res, JSON.parse(cached));
  // ... fetch from DB, then cache.set(key, JSON.stringify(data), 'EX', CACHE_TTL)
};
```

### Phase 3 — Horizontal Scaling
- **Load Balancer**: Nginx or AWS ALB routes traffic across multiple Node.js instances.
- **MongoDB Atlas**: Replica sets (read scaling) + sharding on `owner` field (write scaling).
- **Sticky-free**: JWT is stateless, no sticky sessions needed.

```
[Clients]
    │
[CDN / WAF]
    │
[Load Balancer]  ← health checks /health
   ┌──┴──┐
[API 1][API 2]   ← Node.js stateless pods
   └──┬──┘
   [Redis]       ← shared cache / rate limit store
      │
  [MongoDB]      ← replica set
```

### Phase 4 — Microservices (if needed)
Split into independent services:

| Service | Responsibility | DB |
|---------|---------------|-----|
| `auth-service` | Registration, login, token refresh | Users collection |
| `task-service` | CRUD on tasks | Tasks collection |
| `notification-service` | Due-date reminders, email | - |
| `admin-service` | Stats, user management | Read-only replica |

Services communicate via:
- **Sync**: REST or gRPC (auth checks)
- **Async**: Kafka/RabbitMQ (notifications, audit logs)

An API Gateway (Kong or AWS API Gateway) handles routing, rate limiting, and JWT verification at the edge — removing that responsibility from each service.

### Phase 5 — Observability
- **Structured logging**: Winston already emits JSON logs. Ship to ELK stack or Datadog.
- **Distributed tracing**: OpenTelemetry SDK → Jaeger/Zipkin.
- **Metrics**: Prometheus `/metrics` endpoint + Grafana dashboards.
- **Alerts**: PagerDuty on error rate > 1% or P99 latency > 500ms.

---

## Deployment Options

### Option A — Simple VPS (DigitalOcean / Hetzner)
```bash
docker compose up -d    # MongoDB + Redis + API in containers
# + Nginx reverse proxy + Let's Encrypt SSL
```

### Option B — Managed Cloud (AWS)
- ECS Fargate (containers) or Elastic Beanstalk
- DocumentDB or MongoDB Atlas
- ElastiCache (Redis)
- CloudFront CDN for frontend static assets

### Option C — Kubernetes (at scale)
- Helm charts for each service
- HPA (Horizontal Pod Autoscaler) on CPU/memory
- Secrets managed via Vault or AWS Secrets Manager
