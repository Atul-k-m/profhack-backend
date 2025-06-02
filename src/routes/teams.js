import express from 'express';
import { 
  getAllTeams, 
  createTeam, 
  getTeamDetails, 
  joinTeamRequest, 
  inviteUserToTeam 
} from '../controllers/teamsController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getAllTeams);

router.post('/', verifyToken, createTeam);


router.get('/:teamId', getTeamDetails);

router.post('/:id/join', verifyToken, joinTeamRequest);

router.post('/:id/invite', verifyToken, inviteUserToTeam);

export default router;