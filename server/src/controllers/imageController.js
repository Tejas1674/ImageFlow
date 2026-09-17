const { v4: uuid } = require('uuid');
const prisma = require('../config/db');
const s3Service = require('../services/s3Service');
const { imageProcessingQueue } = require('../config/queue');
const { ALLOWED_MIME_TYPES, MIN_FILE_SIZE_BYTES, MAX_FILE_SIZE_BYTES, REJECTION_REASONS } = require('../utils/constants');

const MIME_TO_FORMAT = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/heic': 'HEIC',
  'image/heif': 'HEIC',
};

let fileTypeFromBuffer;

/**
 * POST /api/images
 * Accepts one or more files (multipart field "images"). For each file:
 *   1. sniffs real file type from magic bytes (never trusts client-declared mimetype)
 *   2. rejects immediately (no S3/DB writes) if the format is invalid — Rule 2
 *   3. otherwise stores the raw upload in S3 and creates a PENDING DB row
 *   4. enqueues async processing for the rest of the validation pipeline
 * Returns 202 with per-file results so the client can reflect status right away.
 */
async function uploadImages(req, res, next) {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'NO_FILES', message: 'No files were uploaded.' });
    }

    const results = await Promise.all(files.map((file) => processUpload(file, req)));
    res.status(202).json({ results });
  } catch (err) {
    next(err);
  }
}

async function processUpload(file, req) {
  // Authoritative format check: inspect actual bytes, not the client-supplied
  // Content-Type (which is trivial to spoof) — this is what prevents someone
  // from e.g. uploading a script renamed to photo.jpg.
  ({ fileTypeFromBuffer } = await import('file-type'));
  const sniffed = await fileTypeFromBuffer(file.buffer);
  const detectedMime = sniffed?.mime;

  if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime)) {
    return {
      originalFileName: file.originalname,
      status: 'REJECTED',
      reasons: [REJECTION_REASONS.INVALID_FORMAT],
    };
  }

  if (file.size < MIN_FILE_SIZE_BYTES || file.size > MAX_FILE_SIZE_BYTES) {
    return {
      originalFileName: file.originalname,
      status: 'REJECTED',
      reasons: [
        file.size < MIN_FILE_SIZE_BYTES
          ? REJECTION_REASONS.TOO_SMALL_FILE_SIZE
          : REJECTION_REASONS.TOO_LARGE_FILE_SIZE,
      ],
    };
  }

  const imageId = uuid();
  const extension = sniffed.ext;
  const rawStorageKey = `uploads/raw/${imageId}.${extension}`;

  await s3Service.uploadBuffer({
    key: rawStorageKey,
    buffer: file.buffer,
    contentType: detectedMime,
  });

  const image = await prisma.image.create({
    data: {
      id: imageId,
      originalFileName: file.originalname,
      originalFormat: MIME_TO_FORMAT[detectedMime],
      originalMimeType: detectedMime,
      originalSizeBytes: file.size,
      rawStorageKey,
      status: 'PENDING',
      uploadedByUserId: req.headers['x-user-id'] || null, // wire up real auth here
    },
  });

  await imageProcessingQueue.add(
    'process-image',
    { imageId: image.id },
    { jobId: image.id } // idempotency: one job per image
  );

  return { id: image.id, originalFileName: image.originalFileName, status: image.status };
}

/**
 * GET /api/images?status=ACCEPTED&page=1&limit=20
 * Cursor-free pagination is fine here since createdAt+id is a stable, indexed sort key;
 * switch to keyset pagination (WHERE createdAt < :cursor) if offset pagination becomes
 * a bottleneck at very large page numbers.
 */
async function listImages(req, res, next) {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const where = status ? { status: status.toUpperCase() } : {};

    const [items, total] = await Promise.all([
      prisma.image.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      prisma.image.count({ where }),
    ]);

    const withUrls = await Promise.all(
      items.map(async (img) => ({
        ...img,
        previewUrl: await s3Service.getSignedGetUrl(img.processedStorageKey || img.rawStorageKey),
      }))
    );

    res.json({
      data: withUrls,
      pagination: { page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/images/:id — single image, including a signed preview URL. */
async function getImage(req, res, next) {
  try {
    const image = await prisma.image.findUnique({ where: { id: req.params.id } });
    if (!image) return res.status(404).json({ error: 'NOT_FOUND' });

    const previewUrl = await s3Service.getSignedGetUrl(image.processedStorageKey || image.rawStorageKey);
    res.json({ ...image, previewUrl });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/images/:id — removes DB row + both S3 objects. */
async function deleteImage(req, res, next) {
  try {
    const image = await prisma.image.findUnique({ where: { id: req.params.id } });
    if (!image) return res.status(404).json({ error: 'NOT_FOUND' });

    await Promise.all([
      s3Service.deleteObject(image.rawStorageKey),
      s3Service.deleteObject(image.processedStorageKey),
    ]);
    await prisma.image.delete({ where: { id: image.id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadImages, listImages, getImage, deleteImage };
