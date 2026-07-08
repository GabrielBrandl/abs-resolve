import { Router } from 'express';
import { parceirosController } from '../controllers/parceiros.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware);

// Portal do parceiro (parceiro logado vê o próprio desempenho)
router.get('/meu-resumo', checkRole('parceiro', 'admin'), (req, res) => parceirosController.meuResumo(req, res));

// Gestão de parceiros (admin/comercial)
router.get('/', checkRole('admin', 'comercial'), (req, res) => parceirosController.listar(req, res));
router.post('/', checkRole('admin'), (req, res) => parceirosController.criar(req, res));
router.get('/:id', checkRole('admin', 'comercial'), (req, res) => parceirosController.detalhe(req, res));
router.put('/:id', checkRole('admin'), (req, res) => parceirosController.atualizar(req, res));
router.delete('/:id', checkRole('admin'), (req, res) => parceirosController.remover(req, res));
router.post('/:id/recalcular-comissoes', checkRole('admin'), (req, res) => parceirosController.recalcularComissoes(req, res));
router.patch('/comissoes/:comissaoId', checkRole('admin'), (req, res) => parceirosController.marcarComissao(req, res));
router.delete('/comissoes/:comissaoId', checkRole('admin'), (req, res) => parceirosController.excluirComissao(req, res));

export default router;
