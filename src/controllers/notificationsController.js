import mongoose from 'mongoose';
import { User, Team, Invitation } from '../models/User.js';

const checkTeamEligibility = async (teamId) => {
  const team = await Team.findById(teamId).populate('members', 'department');
  
  const departmentCounts = {
    core: 0,
    engineering: 0,
    cse: 0
  };

  const coreDepts = ['Physics', 'Chemistry', 'Maths', 'MBA', 'HSS'];
  const engineeringDepts = ['ME', 'CIV', 'EE', 'ECE', 'ETE'];
  const cseDepts = ['CSE', 'ISE', 'AIML', 'CSBS', 'MCA'];

  team.members.forEach(member => {
    if (coreDepts.includes(member.department)) {
      departmentCounts.core++;
    } else if (engineeringDepts.includes(member.department)) {
      departmentCounts.engineering++;
    } else if (cseDepts.includes(member.department)) {
      departmentCounts.cse++;
    }
  });

  const eligibilityDetails = {
    coreDepartments: {
      count: departmentCounts.core,
      required: true,
      fulfilled: departmentCounts.core >= 1 && departmentCounts.core <= 2
    },
    engineeringDepartments: {
      count: departmentCounts.engineering,
      required: true,
      fulfilled: departmentCounts.engineering >= 1 && departmentCounts.engineering <= 2
    },
    cseDepartments: {
      count: departmentCounts.cse,
      required: true,
      fulfilled: departmentCounts.cse >= 2 && departmentCounts.cse <= 3
    }
  };

  const isEligible = eligibilityDetails.coreDepartments.fulfilled && 
                    eligibilityDetails.engineeringDepartments.fulfilled && 
                    eligibilityDetails.cseDepartments.fulfilled;

  await Team.findByIdAndUpdate(teamId, {
    isEligible,
    eligibilityDetails
  });

  return { isEligible, eligibilityDetails };
};

export const sendNotification = async (req, res) => {
  try {
    const { teamId, toUserId, message } = req.body;

    if (!teamId || !toUserId) {
      return res
        .status(400)
        .json({ message: 'teamId and toUserId are required' });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const toUser = await User.findById(toUserId);
    if (!toUser) {
      return res.status(404).json({ message: 'Recipient user not found' });
    }

    const invitation = new Invitation({
      team:    mongoose.Types.ObjectId(teamId),
      from:    mongoose.Types.ObjectId(req.user.userId),
      to:      mongoose.Types.ObjectId(toUserId),
      message: message || `You have been invited to join ${team.name}`
    });
    await invitation.save();

    await invitation.populate('from', 'name username');
    await invitation.populate('to',   'name username');
    await invitation.populate('team', 'name');

    return res.status(201).json({
      message:    'Invitation created successfully',
      invitation: {
        _id:       invitation._id,
        team:      invitation.team,
        from:      invitation.from,
        to:        invitation.to,
        message:   invitation.message,
        status:    invitation.status,
        createdAt: invitation.createdAt
      }
    });
  } catch (error) {
    console.error('Send notification error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    if (req.user.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const query = {
      to: new mongoose.Types.ObjectId(userId)
    };
    if (unreadOnly === 'true') {
      query.status = 'pending';
    }

    const totalCount = await Invitation.countDocuments(query);

    const invitations = await Invitation.find(query)
      .populate('from', 'name username')
      .populate('team', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const notifications = invitations.map(inv => ({
      _id:       inv._id,
      sender:    inv.from,
      type:      'invitation',
      title:     `Invitation to join "${inv.team?.name || 'Unknown'}"`,
      message:   inv.message,
      data:      {
        invitationId: inv._id,
        teamId:       inv.team?._id ?? null
      },
      isRead:    inv.status !== 'pending',
      createdAt: inv.createdAt
    }));

    const unreadCount = await Invitation.countDocuments({
      to:     new mongoose.Types.ObjectId(userId),
      status: 'pending'
    });

    return res.json({
      notifications,
      pagination: {
        page:  parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      },
      unreadCount
    });

  } catch (error) {
    console.error('Get user notifications error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const { id: invitationId } = req.params;
    const invitation = await Invitation.findById(invitationId).populate('team');

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    if (invitation.to.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (invitation.status !== 'pending') {
      return res
        .status(400)
        .json({ message: `Cannot update an invitation with status "${invitation.status}"` });
    }

    const user = await User.findById(req.user.userId);
    if (user.team) {
      return res.status(400).json({ message: 'You are already in a team' });
    }

    const team = invitation.team;
    if (team.members.length >= team.maxMembers) {
      return res.status(400).json({ message: 'Team is full' });
    }

    const departmentCounts = {
      core: 0,
      engineering: 0,
      cse: 0
    };

const coreDepts = [
  'Physics',
  'Chemistry',
  'Mathematics',
  'Master of Business Administration', // MBA
  'Humanities and Social Science'      // HSS
];

const engineeringDepts = [
  'Mechanical Engineering',                  // ME
  'Civil Engineering',                       // CIV
  'Electrical & Electronics Engineering',    // EE
  'Electronics & Communication Engineering', // ECE
  'Electronics & Telecommunication Engineering' // ETE
];

  const cseDepts = [
  'Computer Science and Engineering',                  // CSE
  'Information Science & Engineering',                 // ISE
  'Artificial Intelligence and Machine Learning',      // AIML
  'Computer Science and Business Systems',             // CSBS
  'Master of Computer Applications'                    // MCA
];


    const teamWithMembers = await Team.findById(team._id).populate('members', 'department');
    
    teamWithMembers.members.forEach(member => {
      if (coreDepts.includes(member.department)) {
        departmentCounts.core++;
      } else if (engineeringDepts.includes(member.department)) {
        departmentCounts.engineering++;
      } else if (cseDepts.includes(member.department)) {
        departmentCounts.cse++;
      }
    });

    if (coreDepts.includes(user.department)) {
      departmentCounts.core++;
    } else if (engineeringDepts.includes(user.department)) {
      departmentCounts.engineering++;
    } else if (cseDepts.includes(user.department)) {
      departmentCounts.cse++;
    }

    const violations = [];

    if (departmentCounts.core > 2) {
      violations.push('Accepting this invitation would exceed maximum limit of 2 members from Core departments');
    }

    if (departmentCounts.engineering > 2) {
      violations.push('Accepting this invitation would exceed maximum limit of 2 members from Engineering departments');
    }

    if (departmentCounts.cse > 3) {
      violations.push('Accepting this invitation would exceed maximum limit of 3 members from CSE departments');
    }

    if (violations.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot accept invitation due to department constraints',
        violations 
      });
    }

    invitation.status = 'accepted';
    await invitation.save();

    await Team.findByIdAndUpdate(team._id, {
      $push: { members: req.user.userId }
    });

    await User.findByIdAndUpdate(req.user.userId, {
      team: team._id
    });

    await checkTeamEligibility(team._id);

    return res.json({ message: 'Invitation accepted' });
  } catch (error) {
    console.error('Mark invitation as read error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const declineNotification = async (req, res) => {
  try {
    const { id: invitationId } = req.params;
    const invitation = await Invitation.findById(invitationId);

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }
    if (invitation.to.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (invitation.status !== 'pending') {
      return res
        .status(400)
        .json({ message: `Cannot update an invitation with status "${invitation.status}"` });
    }

    invitation.status = 'declined';
    await invitation.save();

    return res.json({ message: 'Invitation declined' });
  } catch (error) {
    console.error('Decline invitation error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await Invitation.updateMany(
      {
        to:     new mongoose.Types.ObjectId(userId),
        status: 'pending'
      },
      { $set: { status: 'declined' } }
    );

    return res.json({
      message: `Marked ${result.modifiedCount} invitations as declined`
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};