const { S3Client } = require('@aws-sdk/client-s3');

// S3_ENDPOINT + S3_FORCE_PATH_STYLE let this point at any S3-compatible service
// (MinIO, Cloudflare R2, Wasabi, LocalStack) for local dev / free-tier setups.
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
});

module.exports = { s3Client, BUCKET: process.env.S3_BUCKET };
