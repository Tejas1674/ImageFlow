const multer = require('multer');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'FILE_TOO_LARGE', message: err.message });
    }
    return res.status(400).json({ error: 'UPLOAD_ERROR', message: err.message });
  }

  if (err.message === 'UNSUPPORTED_MEDIA_TYPE') {
    return res.status(415).json({ error: 'UNSUPPORTED_MEDIA_TYPE', message: 'Only JPEG, PNG, and HEIC are accepted.' });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong.' : err.message,
  });
}

module.exports = errorHandler;
