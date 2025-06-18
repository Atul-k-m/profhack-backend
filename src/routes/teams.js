import express from 'express';
import { 
  createTeam, 
  getUserTeam, 
  getUserProfile,
  getAllTeams, 
  getTeamById, 
  leaveTeam, 
  deleteTeam, 
  getAllFaculty,
  getProfile,
  updateProfile,
  addMemberToTeam,        
  removeMemberFromTeam,   
  getAvailableFaculty     
} from '../controllers/teamController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();


router.post('/create', verifyToken, createTeam);
router.get('/me', verifyToken, getUserTeam);
router.get('/all', verifyToken, getAllTeams);
router.get('/:id', verifyToken, getTeamById);
router.delete('/:id/leave', verifyToken, leaveTeam);
router.delete('/:id', verifyToken, deleteTeam);


router.post('/:id/members', verifyToken, addMemberToTeam);          
router.delete('/:id/members/:memberId', verifyToken, removeMemberFromTeam);
router.get('/:id/available-faculty', verifyToken, getAvailableFaculty);     

router.get('/faculty/all', verifyToken, getAllFaculty);

export default router;