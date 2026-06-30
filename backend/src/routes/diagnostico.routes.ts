import { Router } from 'express';
import { diagnosticoController } from '../controllers/diagnostico.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { listarServicosDiagnostico } from '../services/ia-diagnostico.service.js';
import { success } from '../utils/response.js';

const router = Router();

router.use(authMiddleware, checkRole('cliente'));

router.get('/catalogo', (_req, res) => success(res, listarServicosDiagnostico()));

router.post(
  '/analisar',
  upload.array('fotos', 5),
  (req, res) => diagnosticoController.analisar(req, res)
);

export default router;
