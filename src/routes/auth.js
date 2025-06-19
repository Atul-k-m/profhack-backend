// routes/auth.js - Updated with forgot password routes

import express from 'express';
import { 
  sendOTP, 
  verifyOTP, 
  resendOTP, 
  register, 
  login,
  forgotPassword,
  resetPassword,
  verifyResetToken
} from '../controllers/authController.js';

const router = express.Router();

// Existing routes
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/register', register);
router.post('/login', login);

// New forgot password routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-reset-token', verifyResetToken);

export default router;