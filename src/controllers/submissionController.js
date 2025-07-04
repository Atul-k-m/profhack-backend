import Submission from '../models/Submission.js';
import Team from '../models/Team.js';
import User from '../models/User.js';

// Create a new submission
export const createSubmission = async (req, res) => {
  try {
    const { trackId, teamId, description } = req.body;
    const userId = req.user._id || req.user.userId;

    // Validate required fields
    if (!trackId) {
      return res.status(400).json({ message: 'Track selection is required' });
    }

    if (!teamId) {
      return res.status(400).json({ message: 'Team ID is required' });
    }

    // Verify that the team exists and user is part of it
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is leader or member of the team
    const isLeader = team.leader.toString() === userId.toString();
    const isMember = team.members.some(memberId => memberId.toString() === userId.toString());

    if (!isLeader && !isMember) {
      return res.status(403).json({ message: 'You are not authorized to submit for this team' });
    }

    // Check if team has already submitted for this track
    const existingSubmission = await Submission.findOne({
      teamId: teamId,
      trackId: trackId
    });

    if (existingSubmission) {
      return res.status(400).json({ 
        message: 'Your team has already submitted for this track',
        existingSubmission: {
          trackId: existingSubmission.trackId,
          trackName: existingSubmission.trackName,
          submissionDate: existingSubmission.submissionDate,
          status: existingSubmission.status
        }
      });
    }

    // Get user information
    const user = await User.findById(userId).select('name');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create new submission
    const newSubmission = new Submission({
      teamId,
      teamName: team.teamName,
      trackId,
      description: description?.trim() || '',
      submittedBy: userId,
      submittedByName: user.name
    });

    await newSubmission.save();

    // Populate the submission with team and user details
    const populatedSubmission = await Submission.findById(newSubmission._id)
      .populate('teamId', 'teamName leader members leaderName memberNames')
      .populate('submittedBy', 'name department designation');

    res.status(201).json({
      message: 'Submission created successfully',
      submission: populatedSubmission
    });

  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({ message: 'Server error during submission creation' });
  }
};

// Get all submissions for a team
export const getTeamSubmissions = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;

    // Find the team where user is leader or member
    const team = await Team.findOne({
      $or: [
        { leader: userId },
        { members: userId }
      ]
    });

    if (!team) {
      return res.status(404).json({ message: 'You are not part of any team' });
    }

    // Get all submissions for the team
    const submissions = await Submission.find({ teamId: team._id })
      .populate('submittedBy', 'name department designation')
      .sort({ submissionDate: -1 });

    res.json({
      team: {
        id: team._id,
        name: team.teamName,
        leader: team.leaderName,
        members: team.memberNames
      },
      submissions
    });

  } catch (error) {
    console.error('Get team submissions error:', error);
    res.status(500).json({ message: 'Server error fetching team submissions' });
  }
};

// Get submission by ID
export const getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.userId;

    const submission = await Submission.findById(id)
      .populate('teamId', 'teamName leader members leaderName memberNames')
      .populate('submittedBy', 'name department designation')
      .populate('reviewedBy', 'name department designation');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check if user has permission to view this submission
    const team = await Team.findById(submission.teamId);
    if (!team) {
      return res.status(404).json({ message: 'Associated team not found' });
    }

    const isLeader = team.leader.toString() === userId.toString();
    const isMember = team.members.some(memberId => memberId.toString() === userId.toString());

    if (!isLeader && !isMember) {
      return res.status(403).json({ message: 'You are not authorized to view this submission' });
    }

    res.json(submission);

  } catch (error) {
    console.error('Get submission by ID error:', error);
    res.status(500).json({ message: 'Server error fetching submission' });
  }
};

// Update submission (only if status is 'submitted')
export const updateSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;
    const userId = req.user._id || req.user.userId;

    const submission = await Submission.findById(id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check if submission can be updated (only if status is 'submitted')
    if (submission.status !== 'submitted') {
      return res.status(400).json({ 
        message: `Cannot update submission with status: ${submission.status}` 
      });
    }

    // Verify user has permission to update
    const team = await Team.findById(submission.teamId);
    if (!team) {
      return res.status(404).json({ message: 'Associated team not found' });
    }

    const isLeader = team.leader.toString() === userId.toString();
    const isMember = team.members.some(memberId => memberId.toString() === userId.toString());

    if (!isLeader && !isMember) {
      return res.status(403).json({ message: 'You are not authorized to update this submission' });
    }

    // Update the submission
    const updatedSubmission = await Submission.findByIdAndUpdate(
      id,
      { 
        description: description?.trim() || '',
        // Update submittedBy to current user
        submittedBy: userId,
        submittedByName: req.user.name
      },
      { new: true }
    )
    .populate('teamId', 'teamName leader members leaderName memberNames')
    .populate('submittedBy', 'name department designation');

    res.json({
      message: 'Submission updated successfully',
      submission: updatedSubmission
    });

  } catch (error) {
    console.error('Update submission error:', error);
    res.status(500).json({ message: 'Server error updating submission' });
  }
};

// Delete submission (only if status is 'submitted')
export const deleteSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.userId;

    const submission = await Submission.findById(id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check if submission can be deleted (only if status is 'submitted')
    if (submission.status !== 'submitted') {
      return res.status(400).json({ 
        message: `Cannot delete submission with status: ${submission.status}` 
      });
    }

    // Verify user has permission to delete
    const team = await Team.findById(submission.teamId);
    if (!team) {
      return res.status(404).json({ message: 'Associated team not found' });
    }

    const isLeader = team.leader.toString() === userId.toString();
    const isMember = team.members.some(memberId => memberId.toString() === userId.toString());

    if (!isLeader && !isMember) {
      return res.status(403).json({ message: 'You are not authorized to delete this submission' });
    }

    await Submission.findByIdAndDelete(id);

    res.json({ message: 'Submission deleted successfully' });

  } catch (error) {
    console.error('Delete submission error:', error);
    res.status(500).json({ message: 'Server error deleting submission' });
  }
};

// Get all submissions (admin/organizer view)
export const getAllSubmissions = async (req, res) => {
  try {
    const { trackId, status, page = 1, limit = 10 } = req.query;
    
    // Build filter object
    const filter = {};
    if (trackId) filter.trackId = trackId;
    if (status) filter.status = status;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get submissions with pagination
    const submissions = await Submission.find(filter)
      .populate('teamId', 'teamName leader members leaderName memberNames')
      .populate('submittedBy', 'name department designation')
      .populate('reviewedBy', 'name department designation')
      .sort({ submissionDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Submission.countDocuments(filter);

    res.json({
      submissions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get all submissions error:', error);
    res.status(500).json({ message: 'Server error fetching submissions' });
  }
};

// Get submission statistics
export const getSubmissionStats = async (req, res) => {
  try {
    const stats = await Submission.getSubmissionStats();
    
    // Get total submissions count
    const totalSubmissions = await Submission.countDocuments();
    
    // Get submissions by status
    const statusStats = await Submission.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent submissions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentSubmissions = await Submission.countDocuments({
      submissionDate: { $gte: sevenDaysAgo }
    });

    res.json({
      totalSubmissions,
      recentSubmissions,
      trackStats: stats,
      statusStats: statusStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });

  } catch (error) {
    console.error('Get submission stats error:', error);
    res.status(500).json({ message: 'Server error fetching submission statistics' });
  }
};

// Get tracks with submission counts
export const getTracksWithStats = async (req, res) => {
  try {
    const tracks = [
      { id: 'smart-campus', name: 'Smart & Sustainable Campus' },
      { id: 'ai-social-impact', name: 'AI & Data Science for Social Impact' },
      { id: 'edtech', name: 'Future of Engineering Education (EdTech)' },
      { id: 'healthcare', name: 'Healthcare Engineering' },
      { id: 'industry-4', name: 'Industry 4.0 & Automation' },
      { id: 'greentech', name: 'Climate Resilience & GreenTech' },
      { id: 'disaster-management', name: 'Disaster Management & Infrastructure' },
      { id: 'assistive-tech', name: 'Assistive Technologies for Disabilities' },
      { id: 'smart-cities', name: 'Smart Cities & Urban Mobility' },
      { id: 'open-innovation', name: 'Open Innovation' }
    ];

    // Get submission counts for each track
    const trackStats = await Submission.aggregate([
      {
        $group: {
          _id: '$trackId',
          count: { $sum: 1 }
        }
      }
    ]);

    // Combine tracks with their submission counts
    const tracksWithStats = tracks.map(track => {
      const stats = trackStats.find(stat => stat._id === track.id);
      return {
        ...track,
        submissionCount: stats ? stats.count : 0
      };
    });

    res.json(tracksWithStats);

  } catch (error) {
    console.error('Get tracks with stats error:', error);
    res.status(500).json({ message: 'Server error fetching track statistics' });
  }
};

// Admin function to update submission status
export const updateSubmissionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;
    const userId = req.user._id || req.user.userId;

    // Validate status
    const validStatuses = ['submitted', 'under-review', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const submission = await Submission.findById(id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Update submission status
    const updatedSubmission = await Submission.findByIdAndUpdate(
      id,
      { 
        status,
        reviewNotes: reviewNotes?.trim() || '',
        reviewedBy: userId,
        reviewedAt: new Date()
      },
      { new: true }
    )
    .populate('teamId', 'teamName leader members leaderName memberNames')
    .populate('submittedBy', 'name department designation')
    .populate('reviewedBy', 'name department designation');

    res.json({
      message: 'Submission status updated successfully',
      submission: updatedSubmission
    });

  } catch (error) {
    console.error('Update submission status error:', error);
    res.status(500).json({ message: 'Server error updating submission status' });
  }
};