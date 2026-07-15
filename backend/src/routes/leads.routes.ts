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

router.get('/etapas', (req, res) => leadsController.etapas(req, res));
router.get('/', (req, res) => leadsController.listar(req, res));
router.post('/', (req, res) => leadsController.criar(req, res));
router.get('/:id', (req, res) => leadsController.buscar(req, res));
router.patch('/:id/etapa', (req, res) => leadsController.atualizarEtapa(req, res));
router.post('/:id/interacoes', (req, res) => leadsController.registrarInteracao(req, res));
router.post('/:id/converter-cliente', (req, res) => leadsController.converterCliente(req, res));
router.get('/:id/historico', (req, res) => leadsController.historico(req, res));

export default router;
