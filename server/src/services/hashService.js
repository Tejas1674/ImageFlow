const sharp = require('sharp');
const prisma = require('../config/db');
const { DUPLICATE_HAMMING_DISTANCE_THRESHOLD } = require('../utils/constants');

/**
 * Difference hash (dHash): resize to 9x8 greyscale, compare each pixel to its
 * right neighbor → 64 bits → hex string. Robust to resizing/compression/minor
 * color shifts, cheap to compute, no extra native deps.
 */
async function computePerceptualHash(buffer) {
  const { data } = await sharp(buffer)
    .greyscale()
    .resize(9, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let bits = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = data[row * 9 + col];
      const right = data[row * 9 + col + 1];
      bits += left < right ? '1' : '0';
    }
  }

  // Pack 64 bits -> 16 hex chars
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

function hammingDistanceHex(hexA, hexB) {
  if (!hexA || !hexB || hexA.length !== hexB.length) return Infinity;
  let distance = 0;
  for (let i = 0; i < hexA.length; i++) {
    const xor = parseInt(hexA[i], 16) ^ parseInt(hexB[i], 16);
    distance += xor.toString(2).split('1').length - 1; // popcount of nibble
  }
  return distance;
}

/**
 * Finds the closest existing ACCEPTED image by Hamming distance on the perceptual hash.
 *
 * Scaling note: comparing against every stored hash is O(n) per upload. That's fine up
 * to a few hundred thousand rows. Beyond that, options are:
 *   - Postgres extension `pgvector` with an approximate-NN index (HNSW) over the hash
 *     bits treated as a fixed-length vector,
 *   - A BK-tree kept in memory/Redis for O(log n) nearest-hash lookups,
 *   - Bucketing by the hash's high bits to prune candidates before computing distance.
 * The interface below (`findNearDuplicate`) is written so swapping the implementation
 * doesn't touch the worker/pipeline code.
 */
async function findNearDuplicate(perceptualHash, { excludeImageId } = {}) {
  const candidates = await prisma.image.findMany({
    where: {
      status: 'ACCEPTED',
      perceptualHash: { not: null },
      ...(excludeImageId ? { id: { not: excludeImageId } } : {}),
    },
    select: { id: true, perceptualHash: true },
    take: 5000, // safety cap; see scaling note above for the real fix at larger scale
    orderBy: { createdAt: 'desc' },
  });

  let closest = null;
  let closestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = hammingDistanceHex(perceptualHash, candidate.perceptualHash);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = candidate;
    }
  }

  if (closest && closestDistance <= DUPLICATE_HAMMING_DISTANCE_THRESHOLD) {
    return { duplicateOfImageId: closest.id, distance: closestDistance };
  }
  return null;
}

module.exports = { computePerceptualHash, hammingDistanceHex, findNearDuplicate };
