const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, BUCKET } = require('../config/s3');

async function uploadBuffer({ key, buffer, contentType }) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // Server-side encryption at rest — part of "secure file handling"
      //ServerSideEncryption: 'AES256',
    })
  );
  return key;
}

async function downloadBuffer(key) {
  const res = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function deleteObject(key) {
  if (!key) return;
  await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

async function getSignedGetUrl(key, expiresInSeconds = 3600) {
  if (!key) return null;
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

module.exports = { uploadBuffer, downloadBuffer, deleteObject, getSignedGetUrl };
