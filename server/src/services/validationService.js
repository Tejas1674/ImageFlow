const {
  MIN_WIDTH_PX,
  MIN_HEIGHT_PX,
  MIN_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_BYTES,
  BLUR_VARIANCE_THRESHOLD,
  MIN_FACE_AREA_PCT,
  MAX_FACES_ALLOWED,
  REJECTION_REASONS,
} = require('../utils/constants');

/**
 * Rule 1 — size/resolution.
 * Applied on the RAW upload (before conversion) so we reject cheap/tiny files fast.
 */
function validateSizeAndResolution({ sizeBytes, width, height }) {
  const reasons = [];
  if (sizeBytes < MIN_FILE_SIZE_BYTES) reasons.push(REJECTION_REASONS.TOO_SMALL_FILE_SIZE);
  if (sizeBytes > MAX_FILE_SIZE_BYTES) reasons.push(REJECTION_REASONS.TOO_LARGE_FILE_SIZE);
  if (width < MIN_WIDTH_PX || height < MIN_HEIGHT_PX) {
    reasons.push(REJECTION_REASONS.TOO_SMALL_RESOLUTION);
  }
  return reasons;
}

/** Rule 4 — blur, via Laplacian variance computed in imageProcessingService. */
function validateBlur(blurScore) {
  return blurScore < BLUR_VARIANCE_THRESHOLD ? [REJECTION_REASONS.BLURRY] : [];
}

/** Rules 5 & 6 — face size and face count. */
function validateFaces({ faceCount, largestFaceAreaPct, skipped }) {
  if (skipped) return []; // face detection disabled in this environment

  const reasons = [];
  if (faceCount === 0) {
    reasons.push(REJECTION_REASONS.NO_FACE_DETECTED);
  }
  if (faceCount > MAX_FACES_ALLOWED) {
    reasons.push(REJECTION_REASONS.MULTIPLE_FACES);
  }
  if (faceCount === 1 && largestFaceAreaPct < MIN_FACE_AREA_PCT) {
    reasons.push(REJECTION_REASONS.FACE_TOO_SMALL);
  }
  return reasons;
}

/** Rule 3 — near-duplicate, decided by hashService.findNearDuplicate upstream. */
function validateDuplicate(duplicateMatch) {
  return duplicateMatch ? [REJECTION_REASONS.DUPLICATE_IMAGE] : [];
}

/**
 * Combines every rule's output into a single verdict. Pure function — easy to unit test.
 */
function buildVerdict(reasonGroups) {
  const reasons = reasonGroups.flat().filter(Boolean);
  return {
    status: reasons.length === 0 ? 'ACCEPTED' : 'REJECTED',
    reasons,
  };
}

module.exports = {
  validateSizeAndResolution,
  validateBlur,
  validateFaces,
  validateDuplicate,
  buildVerdict,
};
