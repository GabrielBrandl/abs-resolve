import { Router } from 'express';
import { adminController } from '../controllers/marketplace.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware);
router.use(checkRole('admin'));

router.get('/usuarios', (req, res) => adminController.listarUsuarios(req, res));
router.post('/usuarios', (req, res) => adminController.criarUsuario(req, res));
router.get('/parceiros', (req, res) => adminController.listarParceiros(req, res));
router.post('/parceiros', (req, res) => adminController.criarParceiro(req, res));
router.get('/auditoria', (req, res) => adminController.auditoria(req, res));
router.get('/notificacoes', (req, res) => adminController.notificacoes(req, res));

export default router;
