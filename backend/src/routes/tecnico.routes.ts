import { Router } from 'express';
import { tecnicoController } from '../controllers/tecnico.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = Router();

router.use(authMiddleware, checkRole('operacional', 'admin'));

router.get('/os', (req, res) => tecnicoController.minhasOs(req, res));
router.get('/os/:id', (req, res) => tecnicoController.buscarOs(req, res));
router.patch('/os/:id/etapa', (req, res) => tecnicoController.etapa(req, res));
router.post('/os/:id/voltar-etapa', (req, res) => tecnicoController.voltarEtapaOs(req, res));
router.patch('/os/:id/checklist', (req, res) => tecnicoController.checklist(req, res));
router.post('/os/:id/concluir', (req, res) => tecnicoController.concluir(req, res));
router.post('/os/:id/foto', upload.single('foto'), (req, res) => tecnicoController.uploadFoto(req, res));
router.get('/agenda', (req, res) => tecnicoController.agendaHoje(req, res));
router.post('/agendamentos/:id/a-caminho', (req, res) => tecnicoController.aCaminho(req, res));
router.post('/agendamentos/:id/chegada', (req, res) => tecnicoController.chegada(req, res));
router.post('/agendamentos/:id/voltar', (req, res) => tecnicoController.voltarAgendamento(req, res));

export default router;
