import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only jpg, png and webp images are allowed'));
  }
};

const _multer = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
});

/**
 * Returns an Express middleware that runs multer's single-file upload for the
 * given field name, then converts any multer error into a 400 JSON response
 * instead of forwarding it to the central error handler.
 * @param {string} field
 * @returns {Function}
 */
export function uploadSingle(field) {
  const handler = _multer.single(field);
  return (req, res, next) => {
    handler(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Image must be 3 MB or less' });
      }
      if (err.name === 'MulterError') {
        return res.status(400).json({ message: err.message });
      }
      // fileFilter error or anything else upload-related
      return res.status(400).json({ message: err.message || 'Invalid file' });
    });
  };
}

export default _multer;
