import { Router } from 'express';
import { financeiroController } from '../controllers/financeiro.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware);
router.use(checkRole('admin', 'comercial'));

router.post('/seed', (req, res) => financeiroController.seed(req, res));
router.post('/backfill-receitas', (req, res) => financeiroController.backfillReceitas(req, res));

router.get('/categorias', (req, res) => financeiroController.categorias(req, res));
router.post('/categorias', (req, res) => financeiroController.salvarCategoria(req, res));
router.post('/subcategorias', (req, res) => financeiroController.salvarSubcategoria(req, res));

router.get('/contas', (req, res) => financeiroController.contas(req, res));
router.post('/contas', (req, res) => financeiroController.salvarConta(req, res));

router.get('/centros-custo', (req, res) => financeiroController.centros(req, res));
router.post('/centros-custo', (req, res) => financeiroController.salvarCentro(req, res));

router.get('/lancamentos', (req, res) => financeiroController.lancamentos(req, res));
router.post('/lancamentos', (req, res) => financeiroController.criarLancamento(req, res));
router.put('/lancamentos/:id', (req, res) => financeiroController.atualizarLancamento(req, res));
router.post('/lancamentos/:id/baixar', (req, res) => financeiroController.baixarLancamento(req, res));
router.get('/export', (req, res) => financeiroController.exportar(req, res));

router.get('/recorrencias', (req, res) => financeiroController.recorrencias(req, res));
router.post('/recorrencias', (req, res) => financeiroController.salvarRecorrencia(req, res));
router.post('/recorrencias/processar', (req, res) => financeiroController.processarRecorrencias(req, res));

router.get('/fluxo-caixa', (req, res) => financeiroController.fluxo(req, res));
router.get('/dre', (req, res) => financeiroController.dre(req, res));
router.get('/resumo', (req, res) => financeiroController.resumo(req, res));

export default router;
