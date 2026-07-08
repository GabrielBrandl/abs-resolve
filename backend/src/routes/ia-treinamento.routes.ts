import { Router } from 'express';
import { iaTreinamentoController } from '../controllers/ia-treinamento.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware, checkRole('admin'));

router.get('/conhecimento', (req, res) => iaTreinamentoController.listar(req, res));
router.post('/chat', (req, res) => iaTreinamentoController.chat(req, res));
router.patch('/conhecimento/:id', (req, res) => iaTreinamentoController.atualizar(req, res));
router.delete('/conhecimento/:id', (req, res) => iaTreinamentoController.excluir(req, res));

export default router;
