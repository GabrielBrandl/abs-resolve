import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { solicitacaoService } from '../services/solicitacao.service.js';
import { success, error } from '../utils/response.js';
import { paramId } from '../utils/params.js';

async function clienteIdFromReq(req: Request): Promise<string> {
  if (!req.user) throw new Error('Não autenticado');
  const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { clienteId: true } });
  if (!user?.clienteId) throw new Error('Cliente não vinculado');
  return user.clienteId;
}

export class SolicitacaoController {
  async catalogo(_req: Request, res: Response) {
    try {
      return success(res, await solicitacaoService.listarCatalogo());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async fluxoServico(req: Request, res: Response) {
    try {
      const slug = typeof req.params.slug === 'string' ? req.params.slug : req.params.slug[0];
      return success(res, solicitacaoService.obterFluxoServico(slug));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 404);
    }
  }

  async calcularPreco(req: Request, res: Response) {
    try {
      const { slug, respostas, quantidade } = req.body as {
        slug: string;
        respostas?: Record<string, string>;
        quantidade?: number;
      };
      if (!slug) return error(res, 'Slug obrigatório', 400);
      return success(res, solicitacaoService.calcularPrecoServico(slug, respostas || {}, quantidade || 1));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async interpretarResposta(req: Request, res: Response) {
    try {
      const { slug, perguntaId, texto } = req.body as {
        slug?: string;
        perguntaId?: string;
        texto?: string;
      };
      if (!slug || !perguntaId) return error(res, 'slug e perguntaId são obrigatórios', 400);
      const { interpretarRespostaFluxo } = await import('../services/fluxo-interpretar.service.js');
      return success(res, await interpretarRespostaFluxo(slug, perguntaId, texto || ''));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async upsells(req: Request, res: Response) {
    try {
      const slug = typeof req.params.slug === 'string' ? req.params.slug : req.params.slug[0];
      return success(res, solicitacaoService.getUpsells(slug));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async descontoPrimeiroServico(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const elegivel = await solicitacaoService.clienteElegivelDescontoPrimeiroServico(clienteId);
      return success(res, {
        elegivel,
        percentual: 10,
        mensagem: elegivel
          ? '10% de desconto no primeiro serviço (PIX, crédito ou débito).'
          : 'Desconto de primeiro serviço já utilizado.',
      });
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async criarCarrinho(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const { itens, express, aceiteIaDiagnostico } = req.body as {
        itens: Array<{ slug: string; quantidade: number; respostas?: Record<string, string>; fotos?: string[] }>;
        express?: boolean;
        aceiteIaDiagnostico?: boolean;
      };
      const data = await solicitacaoService.criarCarrinho(
        clienteId,
        itens || [],
        !!express,
        !!aceiteIaDiagnostico
      );
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async checkout(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const { express } = req.body;
      const data = await solicitacaoService.atualizarCheckout(paramId(req.params.id), clienteId, !!express);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async criar(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const { servicoSlug, opcoes } = req.body;
      const data = await solicitacaoService.criar(clienteId, servicoSlug, opcoes);
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async minhas(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      return success(res, await solicitacaoService.minhasSolicitacoes(clienteId));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async fotos(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const { fotos } = req.body;
      const data = await solicitacaoService.enviarFotos(paramId(req.params.id), clienteId, fotos);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async uploadFotos(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const files = req.files as Express.Multer.File[];
      if (!files?.length) return error(res, 'Nenhuma foto enviada', 400);

      let solicitacaoId = paramId(req.params.id);
      if (solicitacaoId === 'nova') {
        const { servicoSlug, opcoes } = req.body;
        const sol = await solicitacaoService.criar(clienteId, servicoSlug, opcoes ? JSON.parse(opcoes) : {});
        solicitacaoId = sol.id;
      }

      const servicoSlug = typeof req.body.servicoSlug === 'string' ? req.body.servicoSlug : undefined;
      const data = await solicitacaoService.uploadFotos(solicitacaoId, clienteId, files, servicoSlug);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async upsellsAplicar(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const { upsells, express } = req.body;
      const data = await solicitacaoService.aplicarUpsells(paramId(req.params.id), clienteId, upsells || [], !!express);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async horarios(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const data = await solicitacaoService.horariosDisponiveis(paramId(req.params.id), clienteId);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async agendar(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const data = await solicitacaoService.agendar(paramId(req.params.id), clienteId, req.body);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async pagar(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const { metodo, installmentCount } = req.body as {
        metodo?: string;
        installmentCount?: number;
      };
      const data = await solicitacaoService.finalizarPagamento(
        paramId(req.params.id),
        clienteId,
        (metodo || 'PIX') as 'PIX' | 'BOLETO' | 'CARTAO',
        typeof installmentCount === 'number' ? installmentCount : undefined
      );
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async calcularTipoA(req: Request, res: Response) {
    try {
      const { servicoSlug, opcoes, upsells, express } = req.body;
      const data = await solicitacaoService.calcularPrecoFinalTipoA(servicoSlug, opcoes || {}, upsells || [], !!express);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async statusPagamento(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      return success(res, await solicitacaoService.statusPagamento(paramId(req.params.id), clienteId));
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async solicitarOrcamento(req: Request, res: Response) {
    try {
      const clienteId = await clienteIdFromReq(req);
      const { slug, descricao, endereco } = req.body;
      const data = await solicitacaoService.solicitarOrcamento(clienteId, slug, descricao, endereco);
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async configPublica(_req: Request, res: Response) {
    try {
      const { clientePortalService } = await import('../services/cliente-portal.service.js');
      return success(res, await clientePortalService.configPublica());
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }
}

export const solicitacaoController = new SolicitacaoController();
