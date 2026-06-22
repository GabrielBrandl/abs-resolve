import { getSupabase, isSupabaseConfigured } from '../utils/supabase.js';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'documentos';
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

export class StorageService {
  async upload(clienteId: string, file: Express.Multer.File): Promise<{ url: string; filename: string; storage: 'supabase' | 'local' }> {
    if (isSupabaseConfigured()) {
      return this.uploadSupabase(clienteId, file);
    }
    return this.uploadLocal(file);
  }

  async delete(filename: string, storage: 'supabase' | 'local') {
    if (storage === 'supabase' && isSupabaseConfigured()) {
      const supabase = getSupabase()!;
      await supabase.storage.from(BUCKET).remove([filename]);
      return;
    }
    const filepath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  }

  private async uploadSupabase(clienteId: string, file: Express.Multer.File) {
    const supabase = getSupabase()!;
    const ext = path.extname(file.originalname);
    const filename = `${clienteId}/${randomUUID()}${ext}`;

    const buffer = file.buffer ?? fs.readFileSync(file.path);

    const { error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

    if (error) throw new Error(`Erro no upload Supabase: ${error.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    return { url: data.publicUrl, filename, storage: 'supabase' as const };
  }

  private uploadLocal(file: Express.Multer.File) {
    const baseUrl = process.env.API_PUBLIC_URL || 'http://localhost:3001';
    let filename = file.filename;

    if (!filename && file.buffer) {
      const ext = path.extname(file.originalname);
      filename = `${randomUUID()}${ext}`;
      const filepath = path.join(UPLOAD_DIR, filename);
      fs.writeFileSync(filepath, file.buffer);
    }

    return {
      url: `${baseUrl}/uploads/${filename}`,
      filename: filename!,
      storage: 'local' as const,
    };
  }
}

export const storageService = new StorageService();
