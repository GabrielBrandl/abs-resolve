import { Router } from 'express';
import { movimentacaoController } from '../controllers/movimentacao.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware);
router.use(checkRole('admin', 'operacional'));

router.get('/resumo', (req, res) => movimentacaoController.resumo(req, res));
router.get('/', (req, res) => movimentacaoController.listar(req, res));
router.post('/', (req, res) => movimentacaoController.criar(req, res));

export default router;
