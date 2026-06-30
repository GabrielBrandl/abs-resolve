import { Router } from 'express';
import { adminController } from '../controllers/marketplace.controller.js';
import { adminEquipeController } from '../controllers/admin-equipe.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware);
router.use(checkRole('admin'));

router.get('/usuarios', (req, res) => adminEquipeController.listarUsuarios(req, res));
router.post('/usuarios', (req, res) => adminEquipeController.criarUsuario(req, res));
router.put('/usuarios/:id', (req, res) => adminEquipeController.atualizarUsuario(req, res));
router.delete('/usuarios/:id', (req, res) => adminEquipeController.deletarUsuario(req, res));
router.patch('/usuarios/:id/status', (req, res) => adminEquipeController.alterarStatus(req, res));
router.post('/clientes', (req, res) => adminEquipeController.criarCliente(req, res));
router.get('/atribuicoes', (req, res) => adminEquipeController.atribuicoes(req, res));
router.get('/tecnicos-carga', (req, res) => adminEquipeController.tecnicosCarga(req, res));
router.patch('/agendamentos/:id/tecnico', (req, res) => adminEquipeController.atribuirTecnico(req, res));
router.get('/auditoria', (req, res) => adminController.auditoria(req, res));
router.get('/notificacoes', (req, res) => adminController.notificacoes(req, res));
router.get('/campanhas', (req, res) => adminController.campanhas(req, res));
router.post('/campanhas/processar', (req, res) => adminController.processarCampanhas(req, res));

export default router;
