import { Router } from 'express';
import { marketplaceController } from '../controllers/marketplace.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = Router();

router.get('/servicos', (req, res) => marketplaceController.listarServicos(req, res));

router.use(authMiddleware);

router.post('/servicos', checkRole('admin'), (req, res) => marketplaceController.criarServico(req, res));
router.put('/servicos/:id', checkRole('admin'), (req, res) => marketplaceController.atualizarServico(req, res));
router.delete('/servicos/:id', checkRole('admin'), (req, res) => marketplaceController.excluirServico(req, res));
router.post('/servicos/solicitar', checkRole('admin', 'comercial', 'cliente'), (req, res) => marketplaceController.solicitarServico(req, res));

export default router;
