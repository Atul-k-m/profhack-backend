import Team from '../models/Team.js';
import User from '../models/User.js';
import { validateTeamComposition, checkExistingTeamMembership } from '../utils/teamValidation.js';
import { sendTeamCreationEmail } from '../services/emailService.js';

export const createTeam = async (req, res) => {
  try {
    const { teamName, description, members } = req.body;
    const leaderId = req.user._id || req.user.userId;
    const leaderDepartment = req.user.department;

    // Input validation
    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ message: 'Team name is required' });
    }

    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: 'Team members are required' });
    }

    // Remove duplicates and leader from members array
    const uniqueMemberIds = [...new Set(members.filter(id => id !== leaderId.toString()))];

    if (uniqueMemberIds.length !== 4) {
      return res.status(400).json({ 
        message: 'Exactly 4 team members are required (excluding leader)' 
      });
    }

    // Check if team name already exists
    const existingTeam = await Team.findOne({ teamName: teamName.trim() });
    if (existingTeam) {
      return res.status(400).json({ message: 'Team name already exists' });
    }

    // Check if leader has gender information
    const leader = await User.findById(leaderId).select('gender name');
    if (!leader.gender) {
      return res.status(400).json({ 
        message: 'Please update your profile to include gender information before creating a team.' 
      });
    }

    // Validate team composition (now includes gender validation)
    const validation = await validateTeamComposition(leaderDepartment, uniqueMemberIds, leaderId);
    if (!validation.isValid) {
      return res.status(400).json({ 
        message: 'Invalid team composition', 
        errors: validation.errors 
      });
    }

    // Check for existing team memberships
    const allUserIds = [leaderId, ...uniqueMemberIds];
    const membershipCheck = await checkExistingTeamMembership(allUserIds);
    if (membershipCheck.hasConflicts) {
      return res.status(400).json({ 
        message: 'Team membership conflicts found', 
        errors: membershipCheck.conflicts 
      });
    }

    // Verify all members exist and are faculty
    const memberUsers = await User.find({ 
      _id: { $in: uniqueMemberIds }
    }).select('_id name department email designation gender');

    if (memberUsers.length !== uniqueMemberIds.length) {
      return res.status(400).json({ message: 'Some selected members were not found' });
    }

    // Create the team
    const newTeam = new Team({
      teamName: teamName.trim(),
      description: description?.trim() || '',
      leader: leaderId,
      members: uniqueMemberIds
    });

    await newTeam.save();

    // Update user records to reference the team
    await User.findByIdAndUpdate(leaderId, { team: newTeam._id });
    await User.updateMany(
      { _id: { $in: uniqueMemberIds } },
      { team: newTeam._id }
    );

    // Populate team data for response and email
    const populatedTeam = await Team.findById(newTeam._id)
      .populate('leader', 'name department email designation gender')
      .populate('members', 'name department email designation gender');

    // Send confirmation emails (async, don't wait)
    sendTeamCreationEmail(populatedTeam).catch(console.error);

    res.status(201).json({
      message: 'Team created successfully',
      team: populatedTeam
    });

  } catch (error) {
    console.error('Create team error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Team name already exists' });
    }
    res.status(500).json({ message: 'Server error during team creation' });
  }
};

// This endpoint serves both /me routes - returns user team info
export const getUserTeam = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;

    // Find team where user is leader or member
    const team = await Team.findOne({
      $or: [
        { leader: userId },
        { members: userId }
      ]
    })
    .populate('leader', 'name department email designation')
    .populate('members', 'name department email designation');

    if (!team) {
      return res.status(404).json({ message: 'You are not part of any team' });
    }

    res.json(team);
  } catch (error) {
    console.error('Get user team error:', error);
    res.status(500).json({ message: 'Server error fetching team data' });
  }
};

// New endpoint specifically for user profile (matches /api/user/profile)
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find({ status: 'active' })
      .populate('leader', 'name department email designation')
      .populate('members', 'name department email designation')
      .sort({ createdAt: -1 });

    res.json(teams);
  } catch (error) {
    console.error('Get all teams error:', error);
    res.status(500).json({ message: 'Server error fetching teams' });
  }
};

export const getTeamById = async (req, res) => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id)
      .populate('leader', 'name department email designation')
      .populate('members', 'name department email designation');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.json(team);
  } catch (error) {
    console.error('Get team by ID error:', error);
    res.status(500).json({ message: 'Server error fetching team' });
  }
};

export const leaveTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.userId;

    // Validate that we have a valid team ID
    if (!id) {
      return res.status(400).json({ message: 'Team ID is required' });
    }

    // Validate that we have a valid user ID
    if (!userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    // Find the team
    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user is the leader
    if (team.leader.toString() === userId.toString()) {
      return res.status(400).json({ 
        message: 'Team leader cannot leave the team. Please transfer leadership or delete the team.' 
      });
    }

    // Check if user is a member
    const memberIndex = team.members.findIndex(memberId => memberId.toString() === userId.toString());
    if (memberIndex === -1) {
      return res.status(400).json({ message: 'You are not a member of this team' });
    }

    // Remove user from team members array
    team.members.splice(memberIndex, 1);
    await team.save();

    // Update user record to remove team reference
    const userUpdateResult = await User.findByIdAndUpdate(
      userId, 
      { $unset: { team: 1 } },
      { new: true }
    );

    // Check if user update was successful
    if (!userUpdateResult) {
      // Rollback: add user back to team
      team.members.push(userId);
      await team.save();
      return res.status(500).json({ message: 'Failed to update user record' });
    }

    res.json({ 
      message: 'Successfully left the team',
      teamId: id,
      userId: userId.toString()
    });

  } catch (error) {
    console.error('Leave team error:', error);
    
    // Provide more specific error information
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid team ID format' });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error: ' + error.message });
    }
    
    res.status(500).json({ 
      message: 'Server error leaving team',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.userId;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Only team leader can delete the team
    if (team.leader.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only team leader can delete the team' });
    }

    // Remove team reference from all users
    const allMembers = [team.leader, ...team.members];
    await User.updateMany(
      { _id: { $in: allMembers } },
      { $unset: { team: 1 } }
    );

    // Delete the team
    await Team.findByIdAndDelete(id);

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ message: 'Server error deleting team' });
  }
};

// NEW: Add member to team (only leader can do this)
export const addMemberToTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId } = req.body;
    const userId = req.user._id || req.user.userId;

    if (!memberId) {
      return res.status(400).json({ message: 'Member ID is required' });
    }

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Only team leader can add members
    if (team.leader.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only team leader can add members' });
    }

    // Check if team already has maximum members (5 total: 1 leader + 4 members)
    if (team.members.length >= 4) {
      return res.status(400).json({ message: 'Team already has maximum number of members (4)' });
    }

    // Check if user is trying to add themselves
    if (memberId === userId.toString()) {
      return res.status(400).json({ message: 'Cannot add yourself as a member' });
    }

    // Check if member already exists in team
    if (team.members.includes(memberId)) {
      return res.status(400).json({ message: 'User is already a team member' });
    }

    // Check if the user exists and get their department
    const newMember = await User.findById(memberId).select('name department gender team');
    if (!newMember) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already belongs to another team
    if (newMember.team) {
      return res.status(400).json({ message: 'User is already part of another team' });
    }

    // Check if user has gender information
    if (!newMember.gender) {
      return res.status(400).json({ 
        message: 'Selected user must have gender information in their profile to join a team' 
      });
    }

    // Get current team composition including the new member
    const currentMemberIds = [...team.members, memberId];
    const leaderDepartment = req.user.department;
    
    // Validate team composition with new member
    const validation = await validateTeamComposition(leaderDepartment, currentMemberIds, userId);
    if (!validation.isValid) {
      return res.status(400).json({ 
        message: 'Adding this member would violate team composition rules', 
        errors: validation.errors 
      });
    }

    // Add member to team
    team.members.push(memberId);
    await team.save();

    // Update user record
    await User.findByIdAndUpdate(memberId, { team: team._id });

    // Return updated team
    const updatedTeam = await Team.findById(id)
      .populate('leader', 'name department email designation')
      .populate('members', 'name department email designation');

    res.json({
      message: 'Member added successfully',
      team: updatedTeam
    });

  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Server error adding member' });
  }
};

// NEW: Remove member from team (only leader can do this)
export const removeMemberFromTeam = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.user._id || req.user.userId;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Only team leader can remove members
    if (team.leader.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only team leader can remove members' });
    }

    // Check if user is trying to remove themselves (leader)
    if (memberId === userId.toString()) {
      return res.status(400).json({ message: 'Team leader cannot be removed. Delete the team instead.' });
    }

    // Check if member exists in team
    if (!team.members.includes(memberId)) {
      return res.status(400).json({ message: 'User is not a member of this team' });
    }

    // Remove member from team
    team.members = team.members.filter(member => member.toString() !== memberId);
    await team.save();

    // Update user record
    await User.findByIdAndUpdate(memberId, { $unset: { team: 1 } });

    // Return updated team
    const updatedTeam = await Team.findById(id)
      .populate('leader', 'name department email designation')
      .populate('members', 'name department email designation');

    res.json({
      message: 'Member removed successfully',
      team: updatedTeam
    });

  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error removing member' });
  }
};

// NEW: Get available faculty for adding to team
export const getAvailableFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.userId;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Only team leader can view available faculty
    if (team.leader.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only team leader can view available faculty' });
    }

    // Get all current team member IDs (including leader)
    const existingMemberIds = [team.leader, ...team.members];

    // Find faculty who are not in any team and not current team members
    const availableFaculty = await User.find({ 
      _id: { $nin: existingMemberIds },
      team: { $exists: false },
      gender: { $exists: true, $ne: null, $ne: '' } // Only users with gender info
    }).select('name department designation email gender');

    res.json(availableFaculty);
  } catch (error) {
    console.error('Get available faculty error:', error);
    res.status(500).json({ message: 'Server error fetching available faculty' });
  }
};

// Get all faculty for team formation
export const getAllFaculty = async (req, res) => {
  try {
    const currentUserId = req.user._id || req.user.userId;
    
    console.log('Fetching faculty, current user:', currentUserId); // Debug log
    
    // Get all users except the current user, including gender
    const faculty = await User.find({ 
      _id: { $ne: currentUserId }
    }).select('name department designation email gender');

    console.log('Found faculty:', faculty.length); // Debug log
    console.log('Faculty data:', faculty); // Debug log

    res.json(faculty);
  } catch (error) {
    console.error('Get all faculty error:', error);
    res.status(500).json({ 
      message: 'Server error fetching faculty',
      error: error.message 
    });
  }
};

// Profile management functions
export const getProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Updated updateProfile function to handle gender
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const {
      name,
      username,
      email,
      designation,
      department,
      gender, // Add gender to destructuring
      avatarUrl,
      bio,
      skills,
      experience
    } = req.body;

    const updateData = {};
    if (name        !== undefined) updateData.name = name;
    if (username    !== undefined) updateData.username = username;
    if (email       !== undefined) updateData.email = email;
    if (designation !== undefined) updateData.designation = designation;
    if (department  !== undefined) updateData.department = department;
    if (gender      !== undefined) updateData.gender = gender; // Add gender handling
    if (avatarUrl   !== undefined) updateData.avatarUrl = avatarUrl;
    if (bio         !== undefined) updateData.bio = bio;

    if (skills !== undefined) {
      updateData.skills = Array.isArray(skills)
        ? skills.join(', ')
        : skills;
    }

    if (experience !== undefined) {
      const expNum = Number(experience);
      if (Number.isNaN(expNum)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid value for experience'
        });
      }
      updateData.experience = expNum;
    }

    // Validate gender if provided
    if (gender !== undefined && gender !== null && gender !== '') {
      const validGenders = ['M', 'F', 'Male', 'Female'];
      if (!validGenders.includes(gender)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid gender value. Must be M, F, Male, or Female'
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} "${error.keyValue[field]}" is already in use.`
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// Helper function to check if a user can create/join teams (has gender set)
export const checkUserEligibilityForTeam = async (userId) => {
  try {
    const user = await User.findById(userId).select('gender name');
    if (!user) {
      return { eligible: false, message: 'User not found' };
    }
    
    if (!user.gender) {
      return { 
        eligible: false, 
        message: `Please update your profile to include gender information before creating or joining a team.` 
      };
    }
    
    return { eligible: true };
  } catch (error) {
    console.error('Error checking user eligibility:', error);
    return { eligible: false, message: 'Error checking user eligibility' };
  }
};