import { Router } from 'express';
import { catalogoAdminController } from '../controllers/catalogo-admin.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware, checkRole('admin', 'comercial'));

router.get('/servicos', (req, res) => catalogoAdminController.listar(req, res));
router.put('/servicos/:id', (req, res) => catalogoAdminController.atualizar(req, res));
router.delete('/servicos/:id', checkRole('admin'), (req, res) => catalogoAdminController.excluir(req, res));
router.get('/config', (req, res) => catalogoAdminController.config(req, res));
router.put('/config', (req, res) => catalogoAdminController.updateConfig(req, res));
router.get('/estoque', (req, res) => catalogoAdminController.estoque(req, res));
router.put('/estoque/:id', (req, res) => catalogoAdminController.updateEstoque(req, res));
router.get('/tecnicos', (req, res) => catalogoAdminController.tecnicos(req, res));
router.post('/tecnicos', (req, res) => catalogoAdminController.criarTecnico(req, res));
router.get('/agenda', (req, res) => catalogoAdminController.agenda(req, res));
router.get('/orcamentos', (req, res) => catalogoAdminController.orcamentos(req, res));
router.post('/orcamentos/:id/responder', (req, res) => catalogoAdminController.responderOrcamento(req, res));

router.get('/fluxos', checkRole('admin'), (req, res) => catalogoAdminController.listarFluxos(req, res));
router.get('/fluxos/:slug', checkRole('admin'), (req, res) => catalogoAdminController.obterFluxo(req, res));
router.put('/fluxos/:slug', checkRole('admin'), (req, res) => catalogoAdminController.atualizarFluxo(req, res));
router.post('/fluxos/:slug/restaurar', checkRole('admin'), (req, res) => catalogoAdminController.restaurarFluxo(req, res));

export default router;
