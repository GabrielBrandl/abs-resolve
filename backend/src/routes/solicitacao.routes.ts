import { Router } from 'express';
import { solicitacaoController } from '../controllers/solicitacao.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = Router();

router.get('/catalogo', (req, res) => solicitacaoController.catalogo(req, res));
router.get('/config', (req, res) => solicitacaoController.configPublica(req, res));
router.get('/upsells/:slug', (req, res) => solicitacaoController.upsells(req, res));
router.get('/fluxo/:slug', (req, res) => solicitacaoController.fluxoServico(req, res));
router.post('/calcular-preco', (req, res) => solicitacaoController.calcularPreco(req, res));
router.post('/calcular-tipo-a', (req, res) => solicitacaoController.calcularTipoA(req, res));

router.use(authMiddleware, checkRole('cliente'));

router.post('/orcamento', (req, res) => solicitacaoController.solicitarOrcamento(req, res));

router.get('/minhas', (req, res) => solicitacaoController.minhas(req, res));
router.get('/desconto-primeiro-servico', (req, res) => solicitacaoController.descontoPrimeiroServico(req, res));
router.post('/carrinho', (req, res) => solicitacaoController.criarCarrinho(req, res));
router.post('/', (req, res) => solicitacaoController.criar(req, res));
router.post('/:id/checkout', (req, res) => solicitacaoController.checkout(req, res));
router.post('/:id/fotos', (req, res) => solicitacaoController.fotos(req, res));
router.post('/:id/fotos/upload', upload.array('fotos', 5), (req, res) => solicitacaoController.uploadFotos(req, res));
router.post('/:id/upsells', (req, res) => solicitacaoController.upsellsAplicar(req, res));
router.get('/:id/horarios', (req, res) => solicitacaoController.horarios(req, res));
router.get('/:id/status', (req, res) => solicitacaoController.statusPagamento(req, res));
router.post('/:id/agendar', (req, res) => solicitacaoController.agendar(req, res));
router.post('/:id/pagar', (req, res) => solicitacaoController.pagar(req, res));

export default router;
