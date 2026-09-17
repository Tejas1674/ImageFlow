require('dotenv').config();
const { Worker } = require('bullmq');
const { connection, IMAGE_PROCESSING_QUEUE } = require('../config/queue');
const prisma = require('../config/db');
const s3Service = require('../services/s3Service');
const imageProcessingService = require('../services/imageProcessingService');
const hashService = require('../services/hashService');
const faceDetectionService = require('../services/faceDetectionService');
const validationService = require('../services/validationService');
const { MIN_WIDTH_PX, MIN_HEIGHT_PX, REJECTION_REASONS } = require('../utils/constants');

/**
 * Runs the full pipeline for one image. Every step's output is persisted, so
 * partial progress survives a crash/retry and is useful for debugging/tuning.
 */
async function processImage(imageId) {
  const image = await prisma.image.findUnique({ where: { id: imageId } });
  if (!image) throw new Error(`Image ${imageId} not found`);

  await prisma.image.update({ where: { id: imageId }, data: { status: 'PROCESSING' } });

  const rawBuffer = await s3Service.downloadBuffer(image.rawStorageKey);
  const reasonGroups = [];

  // --- Rule 1: resolution (file size was already checked synchronously at upload time) ---
  const meta = await imageProcessingService.getMetadata(rawBuffer);
  reasonGroups.push(
    validationService.validateSizeAndResolution({
      sizeBytes: image.originalSizeBytes,
      width: meta.width || 0,
      height: meta.height || 0,
    }).filter((r) => r !== REJECTION_REASONS.TOO_SMALL_FILE_SIZE && r !== REJECTION_REASONS.TOO_LARGE_FILE_SIZE)
    // (file-size rules already enforced pre-queue; re-checking resolution only here)
  );

  // --- Normalize to JPEG (also handles HEIC -> JPEG conversion, requirement) ---
  const normalizedBuffer = await imageProcessingService.normalizeToJpeg(rawBuffer, meta.format);
  const normalizedMeta = await imageProcessingService.getMetadata(normalizedBuffer);

  // --- Rule 4: blur ---
  const { blurScore } = await imageProcessingService.computeBlurScore(normalizedBuffer);
  reasonGroups.push(validationService.validateBlur(blurScore));

  // --- Rules 5 & 6: face size / face count ---
  const faceResult = await faceDetectionService.detectFaces(normalizedBuffer);
  reasonGroups.push(validationService.validateFaces(faceResult));

  // --- Rule 3: near-duplicate ---
  const perceptualHash = await hashService.computePerceptualHash(normalizedBuffer);
  const duplicateMatch = await hashService.findNearDuplicate(perceptualHash, { excludeImageId: imageId });
  reasonGroups.push(validationService.validateDuplicate(duplicateMatch));

  const verdict = validationService.buildVerdict(reasonGroups);

  // Only keep the processed (converted) file in S3 for accepted images, to save storage;
  // rejected images keep only the raw original for audit/appeal purposes.
  let processedStorageKey = null;
  if (verdict.status === 'ACCEPTED') {
    processedStorageKey = `uploads/processed/${imageId}.jpg`;
    await s3Service.uploadBuffer({
      key: processedStorageKey,
      buffer: normalizedBuffer,
      contentType: 'image/jpeg',
    });
  }

  await prisma.image.update({
    where: { id: imageId },
    data: {
      status: verdict.status,
      rejectionReasons: verdict.reasons,
      processedStorageKey,
      processedFormat: verdict.status === 'ACCEPTED' ? 'JPEG' : null,
      width: normalizedMeta.width,
      height: normalizedMeta.height,
      perceptualHash,
      blurScore,
      faceCount: faceResult.faceCount,
      largestFaceAreaPct: faceResult.largestFaceAreaPct,
      duplicateOfImageId: duplicateMatch?.duplicateOfImageId || null,
    },
  });

  return verdict;
}

const worker = new Worker(
  IMAGE_PROCESSING_QUEUE,
  async (job) => {
    const { imageId } = job.data;
    try {
      return await processImage(imageId);
    } catch (err) {
      // On terminal failure (after BullMQ's retries are exhausted), mark the row
      // so it doesn't sit in PROCESSING forever and is visible to the frontend.
      if (job.attemptsMade >= job.opts.attempts) {
        await prisma.image.update({
          where: { id: imageId },
          data: { status: 'REJECTED', rejectionReasons: [REJECTION_REASONS.PROCESSING_ERROR] },
        });
      }
      throw err;
    }
  },
  {
    connection,
    concurrency: Number(process.env.WORKER_CONCURRENCY) || 4,
  }
);

worker.on('completed', (job, result) => {
  console.log(`[worker] image ${job.data.imageId} -> ${result.status}`, result.reasons);
});
worker.on('failed', (job, err) => {
  console.error(`[worker] image ${job?.data?.imageId} failed:`, err.message);
});

console.log('Image processing worker started.');
