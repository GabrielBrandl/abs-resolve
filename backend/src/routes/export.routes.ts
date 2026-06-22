import { Router } from 'express';
import { exportController } from '../controllers/movimentacao.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware);
router.use(checkRole('admin', 'comercial', 'operacional'));

router.get('/clientes', (req, res) => exportController.clientes(req, res));
router.get('/pedidos', (req, res) => exportController.pedidos(req, res));

export default router;
