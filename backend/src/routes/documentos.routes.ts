import { Router } from 'express';
import { documentosController } from '../controllers/documentos.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { auditLog } from '../middlewares/audit.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/cliente/:clienteId', checkRole('admin', 'comercial', 'operacional'), (req, res) =>
  documentosController.listar(req, res)
);
router.post(
  '/cliente/:clienteId',
  checkRole('admin', 'comercial', 'operacional'),
  upload.single('arquivo'),
  auditLog('upload', 'documento'),
  (req, res) => documentosController.upload(req, res)
);
router.delete('/:id', checkRole('admin', 'comercial'), (req, res) =>
  documentosController.excluir(req, res)
);

export default router;
