import express from 'express';
import { 
  getProfile, 
  updateProfile, 
} from '../controllers/userController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile); 
export default router;