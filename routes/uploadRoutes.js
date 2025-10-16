import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { protect } from '../middleware/authMiddleware.js';
import { saveUpload, listUploads } from '../controllers/uploadController.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    const dir = path.join(__dirname, '..', 'uploads');
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (_) {}
    cb(null, dir);
  },
  filename: function (_req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

const router = express.Router();

router.post('/', protect(['admin', 'employee']), upload.array('files', 5), saveUpload);
router.get('/', protect(['admin', 'employee']), listUploads);

export default router;


