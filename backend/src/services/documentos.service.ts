import { prisma } from '../utils/prisma.js';
import { storageService } from './storage.service.js';

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

    const stored = await storageService.upload(clienteId, file);

    return prisma.documento.create({
      data: {
        clienteId,
        nome: file.originalname,
        filename: stored.filename,
        mimetype: file.mimetype,
        tamanho: file.size,
        url: stored.url,
      },
    });
  }

  async excluir(id: string, clienteId?: string) {
    const doc = await prisma.documento.findFirst({
      where: clienteId ? { id, clienteId } : { id },
    });
    if (!doc) throw new Error('Documento não encontrado');

    const storage = doc.url.includes('supabase') ? 'supabase' : 'local';
    await storageService.delete(doc.filename, storage);

    return prisma.documento.delete({ where: { id } });
  }
}

export const documentosService = new DocumentosService();
