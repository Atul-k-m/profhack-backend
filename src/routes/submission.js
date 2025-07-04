import express from 'express';
import { 
  createSubmission,
  getTeamSubmissions,
  getSubmissionById,
  updateSubmission,
  deleteSubmission,
  getAllSubmissions,
  getSubmissionStats,
  getTracksWithStats,
  getTeamSubmissionStatus,
  updateSubmissionStatus
} from '../controllers/submissionController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes (with authentication)
router.post('/', verifyToken, createSubmission);
router.get('/team/my-submissions', verifyToken, getTeamSubmissions);
router.get('/tracks', verifyToken, getTracksWithStats);
router.get('/:id', verifyToken, getSubmissionById);
router.put('/:id', verifyToken, updateSubmission);
router.delete('/:id', verifyToken, deleteSubmission);
router.get('/team/:teamId', verifyToken, getTeamSubmissionStatus);
// Admin routes (you might want to add admin middleware)
router.get('/', verifyToken, getAllSubmissions);
router.get('/admin/stats', verifyToken, getSubmissionStats);
router.patch('/:id/status', verifyToken, updateSubmissionStatus);

export default router;