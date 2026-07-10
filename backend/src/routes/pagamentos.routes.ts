import { Router } from 'express';
import { pagamentosController } from '../controllers/pagamentos.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware);
router.use(checkRole('admin', 'comercial'));

router.get('/', (req, res) => pagamentosController.listar(req, res));
router.get('/dashboard', (req, res) => pagamentosController.dashboard(req, res));
router.post('/cobrar', (req, res) => pagamentosController.cobrar(req, res));
router.post('/registrar-recebido', (req, res) => pagamentosController.registrarRecebido(req, res));
router.get('/:id/segunda-via', (req, res) => pagamentosController.segundaVia(req, res));

export default router;
