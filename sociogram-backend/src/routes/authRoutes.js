import { Router } from 'express';
import { 
  register, login, refresh, getMe, changePassword, deleteAccount,
  forgotPassword, resetPassword, verifyEmail, resendVerification 
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);
router.delete('/account', authenticate, deleteAccount);

export default router;
