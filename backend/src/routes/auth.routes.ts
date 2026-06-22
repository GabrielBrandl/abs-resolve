import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', (req, res) => authController.login(req, res));
router.post('/login-cliente', (req, res) => authController.loginCliente(req, res));
router.post('/registrar', (req, res) => authController.registrarCliente(req, res));
router.post('/refresh', (req, res) => authController.refresh(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/me', authMiddleware, (req, res) => authController.me(req, res));

export default router;
