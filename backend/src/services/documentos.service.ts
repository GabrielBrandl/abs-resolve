import fs from 'fs';
import path from 'path';
import { prisma } from '../utils/prisma.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const BASE_URL = process.env.API_PUBLIC_URL || 'http://localhost:3001';

export class DocumentosService {
  async listarPorCliente(clienteId: string) {
    return prisma.documento.findMany({
      where: { clienteId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upload(clienteId: string, file: Express.Multer.File) {
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) throw new Error('Cliente não encontrado');

    const url = `${BASE_URL}/uploads/${file.filename}`;

    return prisma.documento.create({
      data: {
        clienteId,
        nome: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        tamanho: file.size,
        url,
      },
    });
  }

  async excluir(id: string, clienteId?: string) {
    const doc = await prisma.documento.findFirst({
      where: clienteId ? { id, clienteId } : { id },
    });
    if (!doc) throw new Error('Documento não encontrado');

    const filepath = path.join(UPLOAD_DIR, doc.filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

    return prisma.documento.delete({ where: { id } });
  }

  getFilePath(filename: string) {
    const filepath = path.join(UPLOAD_DIR, filename);
    if (!fs.existsSync(filepath)) throw new Error('Arquivo não encontrado');
    return filepath;
  }
}

export const documentosService = new DocumentosService();
