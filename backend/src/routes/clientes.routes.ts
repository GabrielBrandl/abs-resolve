import { Router } from 'express';
import { clientesController } from '../controllers/clientes.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';
import { auditLog } from '../middlewares/audit.middleware.js';

const router = Router();

router.use(authMiddleware);
router.use(checkRole('admin', 'comercial', 'operacional'));

router.get('/', (req, res) => clientesController.listar(req, res));
router.post('/', auditLog('criar', 'cliente'), (req, res) => clientesController.criar(req, res));
router.get('/:id', (req, res) => clientesController.buscar(req, res));
router.put('/:id', auditLog('atualizar', 'cliente'), (req, res) => clientesController.atualizar(req, res));
router.patch('/:id/status', auditLog('status', 'cliente'), (req, res) => clientesController.atualizarStatus(req, res));
router.get('/:id/pagamentos', (req, res) => clientesController.pagamentos(req, res));
router.post('/:id/interacoes', (req, res) => clientesController.interacao(req, res));

export default router;
