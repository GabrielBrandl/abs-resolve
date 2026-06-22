import { Router } from 'express';
import { agendamentoController } from '../controllers/agendamento.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/:id/cancelar', checkRole('cliente'), (req, res) => agendamentoController.cancelar(req, res));
router.post('/:id/ausencia', checkRole('admin', 'operacional'), (req, res) => agendamentoController.ausencia(req, res));
router.post('/:id/reagendar', checkRole('cliente', 'admin', 'operacional'), (req, res) => agendamentoController.reagendar(req, res));

export default router;
