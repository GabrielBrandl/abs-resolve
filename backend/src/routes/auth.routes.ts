import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, error: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.' },
});

router.post('/login', loginLimiter, (req, res) => authController.login(req, res));
router.post('/login-cliente', loginLimiter, (req, res) => authController.loginCliente(req, res));
router.post('/registrar', loginLimiter, (req, res) => authController.registrarCliente(req, res));
router.post('/refresh', (req, res) => authController.refresh(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/me', authMiddleware, (req, res) => authController.me(req, res));

export default router;
