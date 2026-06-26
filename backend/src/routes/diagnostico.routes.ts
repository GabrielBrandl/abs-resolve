import { Router } from 'express';
import { diagnosticoController } from '../controllers/diagnostico.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = Router();

router.use(authMiddleware, checkRole('cliente'));

router.post(
  '/analisar',
  upload.array('fotos', 5),
  (req, res) => diagnosticoController.analisar(req, res)
);

export default router;
