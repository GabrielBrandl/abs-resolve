import { Router } from 'express';
import { pedidosController, ordemServicoController } from '../controllers/pedidos.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/status', (req, res) => pedidosController.statusList(req, res));
router.get('/', checkRole('admin', 'comercial', 'operacional'), (req, res) => pedidosController.listar(req, res));
router.post('/', checkRole('admin', 'comercial', 'operacional'), (req, res) => pedidosController.criar(req, res));
router.get('/:id', checkRole('admin', 'comercial', 'operacional'), (req, res) => pedidosController.buscar(req, res));
router.patch('/:id/status', checkRole('admin', 'comercial', 'operacional'), (req, res) => pedidosController.atualizarStatus(req, res));
router.post('/:pedidoId/ordem-servico', checkRole('admin', 'operacional'), (req, res) => ordemServicoController.criar(req, res));

export default router;

export const ordemServicoRouter = Router();
ordemServicoRouter.use(authMiddleware);
ordemServicoRouter.use(checkRole('admin', 'operacional', 'comercial'));

ordemServicoRouter.get('/etapas', (req, res) => ordemServicoController.etapas(req, res));
ordemServicoRouter.get('/', (req, res) => ordemServicoController.listar(req, res));
ordemServicoRouter.get('/:id', (req, res) => ordemServicoController.buscar(req, res));
ordemServicoRouter.patch('/:id/etapa', (req, res) => ordemServicoController.atualizarEtapa(req, res));
ordemServicoRouter.put('/:id', (req, res) => ordemServicoController.atualizar(req, res));
