import { Router } from 'express';
import { dashboardController } from '../controllers/marketplace.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware);
router.use(checkRole('admin', 'comercial', 'operacional'));

router.get('/kpis', (req, res) => dashboardController.kpis(req, res));
router.get('/receita-mensal', (req, res) => dashboardController.receitaMensal(req, res));
router.get('/faturamento-diario', (req, res) => dashboardController.faturamentoDiario(req, res));

export default router;
