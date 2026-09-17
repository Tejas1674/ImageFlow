export const REASON_LABELS = {
  INVALID_FORMAT: 'Unsupported file format — use JPEG, PNG, or HEIC',
  TOO_SMALL_FILE_SIZE: 'File is too small',
  TOO_LARGE_FILE_SIZE: 'File is too large',
  TOO_SMALL_RESOLUTION: 'Resolution is too low',
  DUPLICATE_IMAGE: 'Too similar to an image already uploaded',
  BLURRY: 'Image is too blurry',
  FACE_TOO_SMALL: 'Detected face is too small',
  MULTIPLE_FACES: 'Multiple faces detected',
  NO_FACE_DETECTED: 'No face detected',
  PROCESSING_ERROR: 'Something went wrong while processing this image',
};

export function describeReason(code) {
  return REASON_LABELS[code] || code;
}
