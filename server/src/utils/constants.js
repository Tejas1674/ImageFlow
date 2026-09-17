// Centralized, env-driven configuration so thresholds can be tuned per-environment
// without code changes.

const num = (val, fallback) => (val === undefined || val === '' ? fallback : Number(val));

module.exports = {
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/heic', 'image/heif'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.heic', '.heif'],

  MIN_WIDTH_PX: num(process.env.MIN_WIDTH_PX, 400),
  MIN_HEIGHT_PX: num(process.env.MIN_HEIGHT_PX, 400),
  MIN_FILE_SIZE_BYTES: num(process.env.MIN_FILE_SIZE_BYTES, 10 * 1024), // 10KB
  MAX_FILE_SIZE_BYTES: num(process.env.MAX_FILE_SIZE_BYTES, 20 * 1024 * 1024), // 20MB

  BLUR_VARIANCE_THRESHOLD: num(process.env.BLUR_VARIANCE_THRESHOLD, 100),

  MIN_FACE_AREA_PCT: num(process.env.MIN_FACE_AREA_PCT, 5), // largest face must cover >=5% of image area
  MAX_FACES_ALLOWED: 1,

  DUPLICATE_HAMMING_DISTANCE_THRESHOLD: num(process.env.DUPLICATE_HAMMING_DISTANCE_THRESHOLD, 5),

  REJECTION_REASONS: {
    INVALID_FORMAT: 'INVALID_FORMAT',
    TOO_SMALL_FILE_SIZE: 'TOO_SMALL_FILE_SIZE',
    TOO_LARGE_FILE_SIZE: 'TOO_LARGE_FILE_SIZE',
    TOO_SMALL_RESOLUTION: 'TOO_SMALL_RESOLUTION',
    DUPLICATE_IMAGE: 'DUPLICATE_IMAGE',
    BLURRY: 'BLURRY',
    FACE_TOO_SMALL: 'FACE_TOO_SMALL',
    MULTIPLE_FACES: 'MULTIPLE_FACES',
    NO_FACE_DETECTED: 'NO_FACE_DETECTED',
    PROCESSING_ERROR: 'PROCESSING_ERROR',
  },
};
