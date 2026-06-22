import { paramId } from '../utils/params.js';
import type { Request, Response } from 'express';
import { servicosService, beneficiosService, parceirosService } from '../services/marketplace.service.js';
import { dashboardService, adminService } from '../services/dashboard.service.js';
import { prisma } from '../utils/prisma.js';
import { success, error } from '../utils/response.js';

export class MarketplaceController {
  async listarServicos(req: Request, res: Response) {
    try {
      const data = await servicosService.listar({
        categoria: req.query.categoria as string,
        ativo: req.query.ativo === 'true' ? true : req.query.ativo === 'false' ? false : undefined,
        busca: req.query.busca as string,
      });
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async criarServico(req: Request, res: Response) {
    try {
      const data = await servicosService.criar(req.body);
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async atualizarServico(req: Request, res: Response) {
    try {
      const data = await servicosService.atualizar(paramId(req.params.id), req.body);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async solicitarServico(req: Request, res: Response) {
    try {
      const data = await servicosService.solicitar(req.body);
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async listarBeneficios(req: Request, res: Response) {
    try {
      const data = await beneficiosService.listar({
        categoria: req.query.categoria as string,
        ativo: req.query.ativo === 'true' ? true : undefined,
      });
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async criarBeneficio(req: Request, res: Response) {
    try {
      const data = await beneficiosService.criar(req.body);
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async atualizarBeneficio(req: Request, res: Response) {
    try {
      const data = await beneficiosService.atualizar(paramId(req.params.id), req.body);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }
}

export class DashboardController {
  async kpis(_req: Request, res: Response) {
    try {
      const data = await dashboardService.getKPIs();
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async receitaMensal(_req: Request, res: Response) {
    try {
      const data = await dashboardService.getReceitaMensal();
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async faturamentoDiario(_req: Request, res: Response) {
    try {
      const data = await dashboardService.getFaturamentoDiario();
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }
}

export class AdminController {
  async listarUsuarios(_req: Request, res: Response) {
    try {
      const data = await adminService.listarUsuarios();
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async criarUsuario(req: Request, res: Response) {
    try {
      const data = await adminService.criarUsuario(req.body);
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async listarParceiros(_req: Request, res: Response) {
    try {
      const data = await parceirosService.listar();
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async criarParceiro(req: Request, res: Response) {
    try {
      const data = await parceirosService.criar(req.body);
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async auditoria(req: Request, res: Response) {
    try {
      const data = await adminService.listarAuditoria(
        parseInt(req.query.page as string) || 1
      );
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async notificacoes(_req: Request, res: Response) {
    try {
      const data = await adminService.listarNotificacoes();
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async campanhas(req: Request, res: Response) {
    try {
      const { campanhaCrmService } = await import('../services/campanha-crm.service.js');
      const data = await campanhaCrmService.listar(req.query.status as string | undefined);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async processarCampanhas(_req: Request, res: Response) {
    try {
      const { campanhaCrmService } = await import('../services/campanha-crm.service.js');
      const data = await campanhaCrmService.processarPendentes();
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }
}

export class ClientePortalController {
  async meusPedidos(req: Request, res: Response) {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      if (!user?.clienteId) return error(res, 'Cliente não vinculado', 403);

      const pedidos = await prisma.pedido.findMany({
        where: { clienteId: user.clienteId },
        orderBy: { createdAt: 'desc' },
        include: { ordemServico: true, servico: { select: { nome: true } } },
      });
      return success(res, pedidos);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async financeiro(req: Request, res: Response) {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      if (!user?.clienteId) return error(res, 'Cliente não vinculado', 403);

      const pagamentos = await prisma.pagamento.findMany({
        where: { clienteId: user.clienteId },
        orderBy: { createdAt: 'desc' },
      });
      return success(res, pagamentos);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async meuCadastro(req: Request, res: Response) {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      if (!user?.clienteId) return error(res, 'Cliente não vinculado', 403);

      const cliente = await prisma.cliente.findUnique({ where: { id: user.clienteId } });
      return success(res, cliente);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async atualizarCadastro(req: Request, res: Response) {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      if (!user?.clienteId) return error(res, 'Cliente não vinculado', 403);

      const { telefone, whatsapp, endereco } = req.body;
      const cliente = await prisma.cliente.update({
        where: { id: user.clienteId },
        data: { telefone, whatsapp, endereco },
      });
      return success(res, cliente);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async solicitarServico(req: Request, res: Response) {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      if (!user?.clienteId) return error(res, 'Cliente não vinculado', 403);

      const data = await servicosService.solicitar({
        ...req.body,
        clienteId: user.clienteId,
        responsavel: 'Portal Cliente',
      });
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }

  async documentos(req: Request, res: Response) {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      if (!user?.clienteId) return error(res, 'Cliente não vinculado', 403);

      const { documentosService } = await import('../services/documentos.service.js');
      const data = await documentosService.listarPorCliente(user.clienteId);
      return success(res, data);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 500);
    }
  }

  async uploadDocumento(req: Request, res: Response) {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      if (!user?.clienteId) return error(res, 'Cliente não vinculado', 403);
      if (!req.file) return error(res, 'Arquivo não enviado', 400);

      const { documentosService } = await import('../services/documentos.service.js');
      const data = await documentosService.upload(user.clienteId, req.file);
      return success(res, data, 201);
    } catch (err) {
      return error(res, err instanceof Error ? err.message : 'Erro', 400);
    }
  }
}

export const marketplaceController = new MarketplaceController();
export const dashboardController = new DashboardController();
export const adminController = new AdminController();
export const clientePortalController = new ClientePortalController();
