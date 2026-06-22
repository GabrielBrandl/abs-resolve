import 'dotenv/config';
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
import { pagamentosController } from './controllers/pagamentos.controller.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { success, error } from './utils/response.js';
import { prisma } from './utils/prisma.js';
import { isSupabaseConfigured } from './utils/supabase.js';

const app = express();
const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Muitas tentativas de login.' },
});

app.use(limiter);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(process.cwd(), UPLOAD_DIR)));

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return success(res, {
      status: 'ok',
      service: 'ABS Resolve API',
      version: '2.0.0',
      database: 'connected',
      storage: isSupabaseConfigured() ? 'supabase' : 'local',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return error(res, 'Banco de dados indisponível', 503);
  }
});

app.use('/auth', authLimiter, authRoutes);
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
app.post('/webhooks/asaas', (req, res) => pagamentosController.webhookAsaas(req, res));

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Rota não encontrada' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`ABS Resolve API v1.1 rodando em http://localhost:${PORT}`);
});
