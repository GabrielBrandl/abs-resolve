import { Router } from 'express';
import { nfseAdminController } from '../controllers/nfse-admin.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware);
router.use(checkRole('admin', 'comercial'));

router.get('/dashboard', (req, res) => nfseAdminController.dashboard(req, res));
router.get('/config', (req, res) => nfseAdminController.config(req, res));
router.get('/', (req, res) => nfseAdminController.listar(req, res));
router.get('/:id', (req, res) => nfseAdminController.buscar(req, res));
router.post('/:id/consultar', (req, res) => nfseAdminController.consultar(req, res));
router.post('/:id/reemitir', (req, res) => nfseAdminController.reemitir(req, res));
router.post('/emitir', (req, res) => nfseAdminController.emitirPagamento(req, res));

export default router;
