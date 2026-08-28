import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import authRoutes from './routes/auth.routes.js';
import clientesRoutes from './routes/clientes.routes.js';
import leadsRoutes from './routes/leads.routes.js';
import pedidosRoutes, { ordemServicoRouter } from './routes/pedidos.routes.js';
import pagamentosRoutes from './routes/pagamentos.routes.js';
import marketplaceRoutes from './routes/marketplace.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import adminRoutes from './routes/admin.routes.js';
import clienteRoutes from './routes/cliente.routes.js';
import documentosRoutes from './routes/documentos.routes.js';
import movimentacaoRoutes from './routes/movimentacao.routes.js';
import exportRoutes from './routes/export.routes.js';
import solicitacaoRoutes from './routes/solicitacao.routes.js';
import agendamentoRoutes from './routes/agendamento.routes.js';
import diagnosticoRoutes from './routes/diagnostico.routes.js';
import catalogoAdminRoutes from './routes/catalogo-admin.routes.js';
import iaTreinamentoRoutes from './routes/ia-treinamento.routes.js';
import parceirosRoutes from './routes/parceiros.routes.js';
import tecnicoRoutes from './routes/tecnico.routes.js';
import nfseAdminRoutes from './routes/nfse-admin.routes.js';
import estoqueAdminRoutes from './routes/estoque-admin.routes.js';
import { pagamentosController } from './controllers/pagamentos.controller.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { success, error } from './utils/response.js';
import { prisma } from './utils/prisma.js';
import { isSupabaseConfigured } from './utils/supabase.js';

function databaseHint(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return 'Defina DATABASE_URL em backend/.env (connection string do Supabase).';
  }
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.username === 'abs') {
      return 'DATABASE_URL ainda aponta para o Postgres local (Docker). Substitua pela connection string do Supabase → Settings → Database.';
    }
    return `Falha ao conectar em ${parsed.hostname}. Confira usuário/senha no Supabase e rode: npx prisma migrate deploy`;
  } catch {
    return 'DATABASE_URL inválida. Use o formato postgresql:// do Supabase.';
  }
}

function corsAllowedOrigins(): string[] {
  const origins = [process.env.FRONTEND_URL, process.env.API_PUBLIC_URL].filter(
    (v): v is string => !!v && !v.includes('$(PRIMARY_DOMAIN)')
  );
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175');
  }
  return origins;
}

export function createApp() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';
  const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
  const allowedOrigins = corsAllowedOrigins();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
            },
          }
        : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (!isProd && !allowedOrigins.length) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: isProd ? 300 : 800,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'Muitas requisições. Tente novamente em alguns minutos.' },
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use('/uploads', express.static(path.join(process.cwd(), UPLOAD_DIR)));

  app.get('/', (_req, res) => {
    return success(res, {
      service: 'ABS Resolve API',
      version: '2.1.0',
      status: 'online',
      health: '/health',
      hint: 'Use GET /health para testar conexão com o banco',
    });
  });

  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return success(res, {
        status: 'ok',
        service: 'ABS Resolve API',
        version: '2.1.0',
        database: 'connected',
        storage: isSupabaseConfigured() ? 'supabase' : 'local',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const hint = !isProd ? databaseHint() : undefined;
      console.error('Health check DB error:', err instanceof Error ? err.message : err);
      return error(res, hint ?? 'Banco de dados indisponível', 503);
    }
  });

  app.use('/auth', authRoutes);
  app.use('/clientes', clientesRoutes);
  app.use('/leads', leadsRoutes);
  app.use('/pedidos', pedidosRoutes);
  app.use('/ordens-servico', ordemServicoRouter);
  app.use('/pagamentos', pagamentosRoutes);
  app.use('/marketplace', marketplaceRoutes);
  app.use('/dashboard', dashboardRoutes);
  app.use('/admin', adminRoutes);
  app.use('/cliente', clienteRoutes);
  app.use('/documentos', documentosRoutes);
  app.use('/movimentacao', movimentacaoRoutes);
  app.use('/export', exportRoutes);
  app.use('/solicitacao', solicitacaoRoutes);
  app.use('/agendamentos', agendamentoRoutes);
  app.use('/diagnostico', diagnosticoRoutes);
  app.use('/admin/catalogo', catalogoAdminRoutes);
  app.use('/admin/nfse', nfseAdminRoutes);
  app.use('/admin/estoque', estoqueAdminRoutes);
  app.use('/admin/ia', iaTreinamentoRoutes);
  app.use('/parceiros', parceirosRoutes);
  app.use('/tecnico', tecnicoRoutes);
  app.post('/webhooks/asaas', (req, res) => pagamentosController.webhookAsaas(req, res));

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Rota não encontrada' });
  });

  app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const anyErr = err as { type?: string; status?: number; statusCode?: number };
    if (anyErr?.type === 'entity.too.large' || anyErr?.status === 413 || anyErr?.statusCode === 413) {
      return res.status(413).json({ success: false, error: 'Payload muito grande' });
    }
    return errorHandler(err, req, res, next);
  });

  return app;
}
