import { User, Team, Invitation } from '../models/User.js';
import mongoose from 'mongoose';

const checkTeamEligibility = async (teamId) => {
  const team = await Team.findById(teamId).populate('members', 'department');
  
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

const validateInvitationEligibility = async (teamId, newUserId) => {
  const team = await Team.findById(teamId).populate('members', 'department');
  const newUser = await User.findById(newUserId).select('department');
  
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


  team.members.forEach(member => {
    if (coreDepts.includes(member.department)) {
      departmentCounts.core++;
    } else if (engineeringDepts.includes(member.department)) {
      departmentCounts.engineering++;
    } else if (cseDepts.includes(member.department)) {
      departmentCounts.cse++;
    }
  });

  let newUserCategory = null;
  if (coreDepts.includes(newUser.department)) {
    newUserCategory = 'core';
    departmentCounts.core++;
  } else if (engineeringDepts.includes(newUser.department)) {
    newUserCategory = 'engineering';
    departmentCounts.engineering++;
  } else if (cseDepts.includes(newUser.department)) {
    newUserCategory = 'cse';
    departmentCounts.cse++;
  }

  const violations = [];

  if (departmentCounts.core > 2) {
    violations.push(`Adding this user would exceed maximum limit of 2 members from Core departments (Physics, Chemistry, Maths, MBA, HSS). Current: ${departmentCounts.core - 1}, After adding: ${departmentCounts.core}`);
  }

  if (departmentCounts.engineering > 2) {
    violations.push(`Adding this user would exceed maximum limit of 2 members from Engineering departments (ME, CIV, EE, ECE, ETE). Current: ${departmentCounts.engineering - 1}, After adding: ${departmentCounts.engineering}`);
  }

  if (departmentCounts.cse > 3) {
    violations.push(`Adding this user would exceed maximum limit of 3 members from CSE departments (CSE, ISE, AIML, CSBS, MCA). Current: ${departmentCounts.cse - 1}, After adding: ${departmentCounts.cse}`);
  }

  return {
    isValid: violations.length === 0,
    violations,
    newUserCategory,
    currentCounts: {
      core: departmentCounts.core - (newUserCategory === 'core' ? 1 : 0),
      engineering: departmentCounts.engineering - (newUserCategory === 'engineering' ? 1 : 0),
      cse: departmentCounts.cse - (newUserCategory === 'cse' ? 1 : 0)
    },
    afterCounts: departmentCounts
  };
};

export const getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('leader', 'name username')
      .populate('members', 'name username')
      .sort({ createdAt: -1 });
    
    res.json(teams);
  } catch (error) {
    console.error('Get all teams error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createTeam = async (req, res) => {
  try {
    const { name, description, maxMembers, skills, isPrivate } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (user.team) {
      return res.status(400).json({ message: 'You are already in a team' });
    }

    const team = new Team({
      name,
      description,
      leader: req.user.userId,
      members: [req.user.userId],
      maxMembers: maxMembers || 5,
      skills,
      isPrivate: isPrivate || false
    });

    await team.save();

    await User.findByIdAndUpdate(
      req.user.userId,
      { team: team._id },
      { new: true }
    );

    await checkTeamEligibility(team._id);

    await team.populate('leader', 'name username');
    await team.populate('members', 'name username');

    res.status(201).json({ 
      message: 'Team created successfully', 
      team 
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTeamDetails = async (req, res) => {
  try {
    const { teamId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: 'Invalid team ID format' });
    }

    const team = await Team.findById(teamId)
      .populate('members', 'name designation department');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.json(team);
  } catch (err) {
    console.error('Error fetching team details:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const joinTeamRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (user.team) {
      return res.status(400).json({ message: 'You are already in a team' });
    }

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.members.length >= team.maxMembers) {
      return res.status(400).json({ message: 'Team is full' });
    }

    const eligibilityCheck = await validateInvitationEligibility(id, req.user.userId);
    if (!eligibilityCheck.isValid) {
      return res.status(400).json({ 
        message: 'Cannot join team due to department constraints',
        violations: eligibilityCheck.violations
      });
    }

    const existingInvitation = await Invitation.findOne({
      team: id,
      to: req.user.userId,
      status: 'pending'
    });

    if (existingInvitation) {
      return res.status(400).json({ message: 'You already have a pending invitation for this team' });
    }

    const joinRequest = new Invitation({
      team: id,
      from: req.user.userId,
      to: team.leader,
      message: message || `${user.name} wants to join your team`,
      status: 'pending'
    });

    await joinRequest.save();

    res.json({ message: 'Join request sent successfully' });
  } catch (error) {
    console.error('Join team request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const inviteUserToTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, message } = req.body;
    
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.leader.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Only team leader can invite users' });
    }

    if (team.members.length >= team.maxMembers) {
      return res.status(400).json({ message: 'Team is full' });
    }

    const invitedUser = await User.findById(userId);
    if (!invitedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (invitedUser.team) {
      return res.status(400).json({ message: 'User is already in a team' });
    }

    const eligibilityCheck = await validateInvitationEligibility(id, userId);
    if (!eligibilityCheck.isValid) {
      return res.status(400).json({ 
        message: 'Cannot invite user due to department constraints',
        violations: eligibilityCheck.violations,
        currentTeamComposition: eligibilityCheck.currentCounts,
        afterInvitation: eligibilityCheck.afterCounts
      });
    }

    const existingInvitation = await Invitation.findOne({
      team: id,
      to: userId,
      status: 'pending'
    });

    if (existingInvitation) {
      return res.status(400).json({ message: 'User already has a pending invitation for this team' });
    }

    const invitation = new Invitation({
      team: id,
      from: req.user.userId,
      to: userId,
      message: message || `You are invited to join ${team.name}`,
      status: 'pending'
    });

    await invitation.save();

    res.json({ message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('Invite user to team error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTeamEligibility = async (req, res) => {
  try {
    const { teamId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: 'Invalid team ID format' });
    }

    const eligibilityResult = await checkTeamEligibility(teamId);
    
    res.json({
      teamId,
      ...eligibilityResult
    });
  } catch (error) {
    console.error('Get team eligibility error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};