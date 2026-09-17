# Server

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, Redis, AWS/S3 creds
npx prisma migrate dev --name init
```

You need three things running locally (or use managed free tiers):
- **PostgreSQL** — e.g. `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16`
- **Redis** (for the queue) — e.g. `docker run -p 6379:6379 redis:7`
- **S3-compatible storage** — an AWS free-tier bucket, or run MinIO locally:
  ```bash
  docker run -p 9000:9000 -p 9001:9001 quay.io/minio/minio:latest server /data --console-address ":9001"
  # then set S3_ENDPOINT=http://localhost:9000, S3_FORCE_PATH_STYLE=true in .env
  ```

Face detection uses AWS Rekognition by default (needs real AWS credentials, has a
generous always-free tier). Set `FACE_DETECTION_PROVIDER=none` in `.env` to skip
rules 5/6 entirely for local testing without AWS.

## Run

Two processes, in separate terminals:

```bash
npm run dev      # Express API on :4000
npm run worker   # background validation/processing worker
```

## API

| Method | Path | Description |
|---|---|---|
| POST | `/api/images` | multipart upload, field name `images` (up to 10 files) → `202 { results: [...] }` |
| GET | `/api/images?status=&page=&limit=` | paginated list, optionally filtered by status |
| GET | `/api/images/:id` | single image + signed preview URL |
| DELETE | `/api/images/:id` | delete image (S3 + DB) |

## Scaling notes
- Run multiple `worker` instances behind the same Redis — BullMQ distributes jobs
  across them automatically, so throughput scales horizontally with load.
- The duplicate-detection query in `hashService.findNearDuplicate` is O(n) per
  upload; see the comment in that file for the path to pgvector/BK-tree at scale.
- Add a DB read replica + `findMany` routed to it once `GET /api/images` traffic
  grows — Prisma supports this via multiple datasources.
