/**
 * upload.js — Smart upload middleware for Sociogram.
 *
 * Strategy:
 *   • If CLOUDINARY_URL env var is set → upload to Cloudinary CDN (production)
 *   • Otherwise → save to local /uploads folder (development)
 *
 * Usage in routes:
 *   import { upload } from '../middleware/upload.js';
 *   router.post('/', upload.single('media'), createPost);
 *
 * After upload, req.file.cloudinaryUrl (cloud) or req.file (local disk) is set.
 * The postController reads: req.file?.cloudinaryUrl ?? `/uploads/${req.file?.filename}`
 */

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', '..', 'uploads');

// ── Allowed types ─────────────────────────────────────
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
  'video/mp4', 'video/webm', 'video/quicktime',
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// ── Cloudinary upload (production) ────────────────────
async function makeCloudinaryUpload() {
  const { v2: cloudinary } = await import('cloudinary');
  const { CloudinaryStorage } = await import('multer-storage-cloudinary');

  // CLOUDINARY_URL format: cloudinary://api_key:api_secret@cloud_name
  cloudinary.config({ secure: true });

  const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const isVideo = file.mimetype.startsWith('video/');
      return {
        folder: 'sociogram',
        resource_type: isVideo ? 'video' : 'image',
        // Eager transformations: auto quality + format
        eager: isVideo
          ? [{ streaming_profile: 'full_hd', format: 'm3u8' }]
          : [{ width: 1080, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
        public_id: `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      };
    },
  });

  return multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });
}

// ── Local disk upload (development) ───────────────────
function makeLocalUpload() {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
  });
  return multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });
}

// ── Export the right uploader ─────────────────────────
// We lazy-init so the module can be imported before CLOUDINARY_URL is read.
let _upload = null;

async function getUpload() {
  if (_upload) return _upload;
  if (process.env.CLOUDINARY_URL) {
    _upload = await makeCloudinaryUpload();
  } else {
    _upload = makeLocalUpload();
  }
  return _upload;
}

/**
 * Express middleware that delegates to the right uploader.
 * Wraps a single-file upload as a Promise for async/await compatibility.
 */
export function uploadMedia(req, res, next) {
  getUpload().then((uploader) => {
    uploader.single('media')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'File too large. Max 50 MB.' });
        }
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  }).catch(next);
}

// Keep the old named export for any legacy imports
export { uploadMedia as upload };
