import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { analisarFotos } from '../services/ia-diagnostico.service.js';
import { storageService } from '../services/storage.service.js';
import { success, error } from '../utils/response.js';

export class DiagnosticoService {
  async analisarComFotos(
    clienteId: string,
    files: Express.Multer.File[],
    contexto?: string,
    servicoSlug = 'diagnostico-produto'
  ) {
    if (!files.length) throw new Error('Envie pelo menos uma foto');

    const urls: string[] = [];
    for (const file of files) {
      const { url } = await storageService.upload(clienteId, file);
      urls.push(url);
    }

    const analise = await analisarFotos(servicoSlug, urls, {
      descricao: contexto || '',
      contexto: contexto || '',
      ...(servicoSlug !== 'diagnostico-produto' ? { servicoCatalogoSlug: servicoSlug } : {}),
    });

    return {
      fotos: urls,
      analise,
      orientacao:
        'Este diagnóstico é apenas informativo. Para contratar um serviço, acesse Solicitar Serviço e adicione ao carrinho.',
    };
  }
}

export const diagnosticoService = new DiagnosticoService();

export class DiagnosticoController {
  async analisar(req: Request, res: Response) {
    try {
      if (!req.user) return error(res, 'Não autenticado', 401);
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { clienteId: true },
      });
      if (!user?.clienteId) return error(res, 'Cliente não vinculado', 400);

      const files = req.files as Express.Multer.File[];
      const contexto = typeof req.body.contexto === 'string' ? req.body.contexto : undefined;
      const servicoSlug =
        typeof req.body.servicoSlug === 'string' && req.body.servicoSlug && req.body.servicoSlug !== 'auto'
          ? req.body.servicoSlug
          : 'diagnostico-produto';
      const data = await diagnosticoService.analisarComFotos(user.clienteId, files, contexto, servicoSlug);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro no diagnóstico', 400);
    }
  }
}

export const diagnosticoController = new DiagnosticoController();
