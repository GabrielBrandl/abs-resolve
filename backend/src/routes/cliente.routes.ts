import { Router } from 'express';
import { clientePortalController } from '../controllers/marketplace.controller.js';
import { clientePortalExtraController } from '../controllers/cliente-portal-extra.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = Router();

router.get('/config', (req, res) => clientePortalExtraController.config(req, res));

router.use(authMiddleware);
router.use(checkRole('cliente'));

router.get('/pedidos', (req, res) => clientePortalExtraController.pedidosTimeline(req, res));
router.get('/garantias', (req, res) => clientePortalExtraController.garantias(req, res));
router.get('/avaliacoes/pendentes', (req, res) => clientePortalExtraController.pendenteAvaliacao(req, res));
router.post('/avaliacoes/:osId', (req, res) => clientePortalExtraController.avaliar(req, res));
router.post('/orcamento', (req, res) => clientePortalExtraController.solicitarOrcamento(req, res));
router.put('/endereco', (req, res) => clientePortalExtraController.atualizarEndereco(req, res));
router.get('/solicitacao/:id/pagamento', (req, res) => clientePortalExtraController.statusPagamento(req, res));
router.post('/pagamentos/:pagamentoId/simular', (req, res) => clientePortalExtraController.simularPagamento(req, res));
router.get('/financeiro', (req, res) => clientePortalController.financeiro(req, res));
router.get('/cadastro', (req, res) => clientePortalController.meuCadastro(req, res));
router.put('/cadastro', (req, res) => clientePortalController.atualizarCadastro(req, res));
router.get('/documentos', (req, res) => clientePortalController.documentos(req, res));
router.post('/documentos', upload.single('arquivo'), (req, res) => clientePortalController.uploadDocumento(req, res));

export default router;
