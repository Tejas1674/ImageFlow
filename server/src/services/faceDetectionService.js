const { RekognitionClient, DetectFacesCommand } = require('@aws-sdk/client-rekognition');

/**
 * Face detection is intentionally behind a small interface (`detectFaces`) so the
 * provider can be swapped without touching the validation pipeline:
 *   - "rekognition" (default): AWS Rekognition DetectFaces — no model files to ship,
 *     scales independently of the API/worker processes, pay-per-call.
 *   - "none": short-circuits the check (useful for local dev without AWS creds).
 *
 * A fully local alternative (no external calls) can be dropped in here using
 * `face-api.js` + `@tensorflow/tfjs-node` with the SSD MobileNet or BlazeFace model —
 * same return shape: { faceCount, largestFaceAreaPct }.
 */

const rekognitionClient =
  process.env.FACE_DETECTION_PROVIDER !== 'none'
    ? new RekognitionClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      })
    : null;

async function detectFacesRekognition(imageBuffer) {
  const command = new DetectFacesCommand({
    Image: { Bytes: imageBuffer },
    Attributes: ['DEFAULT'],
  });
  const result = await rekognitionClient.send(command);
  const faces = result.FaceDetails || [];

  const faceAreas = faces.map((f) => {
    // BoundingBox values are already fractions (0-1) of image width/height
    const { Width, Height } = f.BoundingBox;
    return Width * Height * 100; // as a percentage of total image area
  });

  const largestFaceAreaPct = faceAreas.length ? Math.max(...faceAreas) : 0;

  return { faceCount: faces.length, largestFaceAreaPct };
}

async function detectFaces(imageBuffer) {
  const provider = process.env.FACE_DETECTION_PROVIDER || 'rekognition';

  if (provider === 'none') {
    return { faceCount: null, largestFaceAreaPct: null, skipped: true };
  }

  if (provider === 'rekognition') {
    return detectFacesRekognition(imageBuffer);
  }

  throw new Error(`Unknown FACE_DETECTION_PROVIDER: ${provider}`);
}

module.exports = { detectFaces };
