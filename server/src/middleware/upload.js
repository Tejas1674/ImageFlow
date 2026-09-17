const multer = require('multer');
const { MAX_FILE_SIZE_BYTES } = require('../utils/constants');

// Memory storage: we stream straight to S3 rather than writing to local disk,
// which avoids leaving user-controlled files sitting on the server's filesystem
// (part of "secure file handling").
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 10, // cap batch size per request
  },
  fileFilter: (req, file, cb) => {
    // Cheap client-declared-mimetype check up front; the authoritative check is
    // the magic-byte sniff in imageController (client-declared mimetype is
    // trivially spoofable and must never be trusted alone).
    const allowed = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('UNSUPPORTED_MEDIA_TYPE'));
    }
    cb(null, true);
  },
});

module.exports = upload;
