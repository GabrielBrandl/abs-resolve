import multer from 'multer';
import { isSupabaseConfigured } from '../utils/supabase.js';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const ALLOWED = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Tipo de arquivo não permitido'));
};

export const upload = multer({
  storage: isSupabaseConfigured() ? multer.memoryStorage() : diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});
