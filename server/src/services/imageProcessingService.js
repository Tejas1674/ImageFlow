const sharp = require('sharp');
const heicConvert = require('heic-convert');

/**
 * Read basic metadata (format/width/height) without decoding the full pixel buffer.
 */
async function getMetadata(buffer) {
  const meta = await sharp(buffer).metadata();
  return { format: meta.format, width: meta.width, height: meta.height };
}

/**
 * Converts HEIC/HEIF to JPEG. Tries sharp first (fast, uses libvips' built-in
 * HEIF support when available); falls back to the pure-JS `heic-convert`
 * package for environments where libvips wasn't built with libheif.
 */
async function convertHeicToJpeg(buffer) {
  try {
    return await sharp(buffer, { failOn: 'none' }).jpeg({ quality: 90 }).toBuffer();
  } catch (sharpErr) {
    const outputBuffer = await heicConvert({ buffer, format: 'JPEG', quality: 0.9 });
    return Buffer.from(outputBuffer);
  }
}

/**
 * Normalizes any accepted input format to a JPEG buffer suitable for storage/serving,
 * re-encoding PNG/JPEG too (strips EXIF/GPS metadata for privacy & re-validates pixels).
 */
async function normalizeToJpeg(buffer, originalFormat) {
  if (originalFormat === 'heif' || originalFormat === 'heic') {
    return convertHeicToJpeg(buffer);
  }
  return sharp(buffer).rotate().jpeg({ quality: 92 }).toBuffer();
}

/**
 * Blur detection via Laplacian variance.
 * 1. Grayscale + downscale (keeps this fast and resolution-independent)
 * 2. Convolve with a Laplacian kernel (edge/second-derivative detector)
 * 3. Variance of the resulting pixel intensities: sharp edges → high variance,
 *    smooth/blurry images → low variance.
 */
async function computeBlurScore(buffer) {
  const LAPLACIAN_KERNEL = {
    width: 3,
    height: 3,
    kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0],
  };

  const { data, info } = await sharp(buffer)
    .greyscale()
    .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
    .convolve(LAPLACIAN_KERNEL)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const n = data.length;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += data[i];
  const mean = sum / n;

  let variance = 0;
  for (let i = 0; i < n; i++) {
    const d = data[i] - mean;
    variance += d * d;
  }
  variance /= n;

  return { blurScore: variance, sampledPixels: n, dims: { w: info.width, h: info.height } };
}

module.exports = { getMetadata, convertHeicToJpeg, normalizeToJpeg, computeBlurScore };
