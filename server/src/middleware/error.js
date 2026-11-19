/**
 * Central error-handling middleware.
 * Maps well-known error types to appropriate HTTP status codes.
 * Never leaks stack traces or secrets.
 */
const errorHandler = (err, req, res, _next) => {
  // JWT errors → 401
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err.name === 'NotBeforeError') {
    return res.status(401).json({ message: 'Not authorised, invalid token' });
  }

  // Mongoose validation error → 400
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: errors[0], errors });
  }

  // Mongoose CastError on an id → 404
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(404).json({ message: 'Resource not found' });
  }

  // MongoDB duplicate key → 409
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ message: `${field} already exists` });
  }

  // Multer file size error → 400
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Image must be 3 MB or less' });
  }

  // Generic multer or file type error → 400
  if (err.name === 'MulterError' || (err.message && err.message.includes('Only jpg'))) {
    return res.status(400).json({ message: err.message });
  }

  // Everything else → 500
  console.error(err);
  res.status(err.status || 500).json({ message: 'Internal server error' });
};

export default errorHandler;
