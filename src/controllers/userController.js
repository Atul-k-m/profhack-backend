import { User, Team, Invitation } from '../models/User.js';

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAvailableUsers = async (req, res) => {
  try {
    const users = await User.find({ team: null })
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    console.error('Available users fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      name,
      username,
      email,
      designation,
      department,
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

export const getUserInvitations = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (req.user.userId !== id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get only pending invitations - processed ones should be hidden
    const invitations = await Invitation.find({ 
      to: id, 
      status: 'pending' 
    })
    .populate('team', 'name description maxMembers')
    .populate('from', 'name username')
    .sort({ createdAt: -1 });

    res.json(invitations);
  } catch (error) {
    console.error('User invitations fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const acceptInvitation = async (req, res) => {
  try {
    const { id: invitationId } = req.params;
    const currentUserId = req.user.userId;

    const invitation = await Invitation.findById(invitationId)
      .populate('from', 'name username')
      .populate('to', 'name username')
      .populate('team', 'name members maxMembers');

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    if (invitation.to._id.toString() !== currentUserId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot accept an invitation with status "${invitation.status}"` 
      });
    }

    // Check if user is already in a team
    const currentUser = await User.findById(currentUserId);
    if (currentUser.teamId) {
      return res.status(400).json({ 
        message: 'You are already a member of another team.' 
      });
    }

    const team = await Team.findById(invitation.team._id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if team is full
    if (team.members.length >= team.maxMembers) {
      return res.status(400).json({ message: 'Team is already full' });
    }

    // Add user to team
    team.members.push(currentUserId);
    await team.save();

    // Update user's team
    await User.findByIdAndUpdate(currentUserId, { teamId: team._id });

    // Mark invitation as accepted
    invitation.status = 'accepted';
    await invitation.save();

    // Cancel all other pending invitations for this user
    await Invitation.updateMany(
      { 
        to: currentUserId, 
        status: 'pending',
        _id: { $ne: invitationId }
      },
      { status: 'cancelled' }
    );

    return res.json({ 
      message: 'Invitation accepted and user added to team',
      team: {
        id: team._id,
        name: team.name
      }
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const declineInvitation = async (req, res) => {
  try {
    const { id: invitationId } = req.params;
    const currentUserId = req.user.userId;

    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    if (invitation.to.toString() !== currentUserId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot decline an invitation with status "${invitation.status}"` 
      });
    }

    invitation.status = 'declined';
    await invitation.save();

    return res.json({ message: 'Invitation declined' });
  } catch (error) {
    console.error('Decline invitation error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};