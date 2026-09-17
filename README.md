# Image Upload & Validation System

A full-stack system for uploading images, running them through an async validation/processing
pipeline (format, resolution, blur, face count/size, duplicate detection), converting HEIC to
JPEG/PNG, and sorting results into **Accepted** / **Rejected** with reasons.

```
image-upload-system/
├── server/     Node.js + Express REST API, Prisma + PostgreSQL, S3, BullMQ worker
└── client/     React (hooks-based) frontend
```

## Architecture overview

```
Browser
  │  1. client-side validation (type/size)
  ▼
POST /api/images (multipart)
  │  2. quick sync checks (mime sniffing, size ceiling)
  │  3. raw file → S3 (uploads/raw/…)
  │  4. DB row created, status=PENDING
  │  5. job pushed to BullMQ queue
  ▼                                        ┌─────────────────────────────┐
202 Accepted { id, status: "PENDING" } ◄───┤  Express responds immediately │
                                            └─────────────────────────────┘

Background worker (separate process, horizontally scalable)
  │  - download raw file from S3
  │  - sharp: read metadata, convert HEIC → JPEG if needed
  │  - run validations (resolution, blur, faces, duplicate hash)
  │  - upload processed file → S3 (uploads/processed/…)
  │  - update DB: status=ACCEPTED|REJECTED, reasons[], phash, blurScore, faceCount
  ▼
Frontend polls GET /api/images/:id (or GET /api/images?status=) to reflect the result
```

Processing is decoupled from the upload request via a **queue (BullMQ/Redis)** so uploads stay
fast and the system can scale workers horizontally for large volumes — this satisfies the
"process images asynchronously" and "handle large-scale uploads" requirements.

## Why these choices

| Concern | Choice | Why |
|---|---|---|
| ORM | Prisma | Type-safe, migrations, good Postgres support |
| Storage | S3 (or any S3-compatible: MinIO/Wasabi/R2) | Requirement; also works great locally via MinIO |
| HEIC → JPEG/PNG | `sharp` (libvips w/ HEIF), with `heic-convert` fallback | `sharp` is the fastest option in Node; fallback covers builds without libheif |
| Blur detection | Laplacian-variance via `sharp.convolve` | No extra native deps; well-understood metric |
| Duplicate/near-duplicate detection | Perceptual hash (dHash) computed in `sharp`, Hamming distance in Postgres | Cheap, no extra service; documented path to pgvector/BK-tree for scale |
| Face detection | AWS Rekognition `DetectFaces` | Offloads ML inference, no heavyweight model files to ship; pluggable — see `faceDetectionService.js` for a local `face-api.js`/tfjs alternative |
| Async processing | BullMQ + Redis | Battle-tested, retries/backoff, horizontally scalable workers |

See `server/README.md` and `client/README.md` for setup instructions.
