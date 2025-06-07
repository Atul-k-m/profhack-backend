import express from 'express';
import { 
  getProfile, 
  updateProfile,  
  getAvailableUsers, 
  getUserInvitations,
  acceptInvitation,
  declineInvitation
} from '../controllers/userController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile); 
router.get('/available', getAvailableUsers);
router.get('/:id/invitations', verifyToken, getUserInvitations);
router.post('/invitations/:id/accept', verifyToken, acceptInvitation);
router.post('/invitations/:id/decline', verifyToken, declineInvitation);

export default router;