import { Router } from 'express';
import { clientePortalController } from '../controllers/marketplace.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = Router();

router.use(authMiddleware);
router.use(checkRole('cliente'));

router.get('/pedidos', (req, res) => clientePortalController.meusPedidos(req, res));
router.get('/financeiro', (req, res) => clientePortalController.financeiro(req, res));
router.get('/cadastro', (req, res) => clientePortalController.meuCadastro(req, res));
router.put('/cadastro', (req, res) => clientePortalController.atualizarCadastro(req, res));
router.post('/solicitar-servico', (req, res) => clientePortalController.solicitarServico(req, res));
router.get('/documentos', (req, res) => clientePortalController.documentos(req, res));
router.post('/documentos', upload.single('arquivo'), (req, res) => clientePortalController.uploadDocumento(req, res));

export default router;
