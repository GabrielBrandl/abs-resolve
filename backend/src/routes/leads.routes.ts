import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { leadsController } from '../controllers/leads.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = Router();

const capturaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas tentativas. Aguarde alguns minutos.' },
});

router.post('/captura-consultor', capturaLimiter, (req, res) =>
  leadsController.capturarConsultor(req, res)
);

router.use(authMiddleware);
router.use(checkRole('admin', 'comercial'));

router.get('/dashboard', (req, res) => leadsController.dashboard(req, res));
router.get('/indicadores', (req, res) => leadsController.indicadores(req, res));
router.get('/etapas', (req, res) => leadsController.etapas(req, res));
router.get('/motivos-perda', (req, res) => leadsController.motivosPerda(req, res));
router.get('/', (req, res) => leadsController.listar(req, res));
router.post('/', (req, res) => leadsController.criar(req, res));
router.get('/:id/timeline', (req, res) => leadsController.timeline(req, res));
router.get('/:id', (req, res) => leadsController.buscar(req, res));
router.patch('/:id', (req, res) => leadsController.atualizar(req, res));
router.patch('/:id/etapa', (req, res) => leadsController.atualizarEtapa(req, res));
router.patch('/:id/status-comercial', (req, res) => leadsController.atualizarStatusComercial(req, res));
router.post('/:id/interacoes', (req, res) => leadsController.registrarInteracao(req, res));
router.post('/:id/converter-cliente', (req, res) => leadsController.converterCliente(req, res));
router.post('/:id/orcamento', (req, res) => leadsController.criarOrcamento(req, res));
router.post('/:id/pedido', (req, res) => leadsController.criarPedido(req, res));
router.post('/:id/follow-up', (req, res) => leadsController.agendarFollowUp(req, res));
router.post('/:id/vincular-orcamento', (req, res) => leadsController.vincularOrcamento(req, res));
router.get('/:id/historico', (req, res) => leadsController.historico(req, res));
router.delete('/:id', (req, res) => leadsController.excluir(req, res));

export default router;
