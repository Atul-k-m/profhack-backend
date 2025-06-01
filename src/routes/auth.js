import express from 'express';
import { sendOTP, verifyOTP, resendOTP, register, login } from '../controllers/authController.js';

const router = express.Router();

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/register', register);
router.post('/login', login);

export default router;