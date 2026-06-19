import { Router } from 'express';
import { marketplaceController } from '../controllers/marketplace.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = Router();

router.get('/servicos', (req, res) => marketplaceController.listarServicos(req, res));
router.get('/beneficios', (req, res) => marketplaceController.listarBeneficios(req, res));

router.use(authMiddleware);

router.post('/servicos', checkRole('admin'), (req, res) => marketplaceController.criarServico(req, res));
router.put('/servicos/:id', checkRole('admin'), (req, res) => marketplaceController.atualizarServico(req, res));
router.post('/servicos/solicitar', checkRole('admin', 'comercial', 'cliente'), (req, res) => marketplaceController.solicitarServico(req, res));
router.post('/beneficios', checkRole('admin'), (req, res) => marketplaceController.criarBeneficio(req, res));
router.put('/beneficios/:id', checkRole('admin'), (req, res) => marketplaceController.atualizarBeneficio(req, res));

export default router;
