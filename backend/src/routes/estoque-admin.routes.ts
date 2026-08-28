import { Router } from 'express';
import { estoqueAdminController } from '../controllers/estoque-admin.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { checkRole } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware, checkRole('admin', 'comercial'));

router.get('/dashboard', (req, res) => estoqueAdminController.dashboard(req, res));
router.get('/alertas', (req, res) => estoqueAdminController.alertas(req, res));
router.post('/sincronizar', checkRole('admin'), (req, res) => estoqueAdminController.sincronizar(req, res));
router.get('/', (req, res) => estoqueAdminController.listar(req, res));
router.post('/', checkRole('admin'), (req, res) => estoqueAdminController.criar(req, res));
router.get('/:id', (req, res) => estoqueAdminController.buscar(req, res));
router.patch('/:id', (req, res) => estoqueAdminController.atualizar(req, res));
router.post('/:id/movimentar', (req, res) => estoqueAdminController.movimentar(req, res));
router.post('/:id/liberar-reserva', (req, res) => estoqueAdminController.liberarReserva(req, res));
router.get('/:id/historico', (req, res) => estoqueAdminController.historico(req, res));

export default router;
