import { User, Team,Invitation } from '../models/User.js';

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

export const getUserInvitations = async (req, res) => {
  try {
    const { id } = req.params;
    
  
    if (req.user.userId !== id) {
      return res.status(403).json({ message: 'Access denied' });
    }

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
      .populate('to',   'name username')
      .populate('team', 'name members');
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }


    if (invitation.to._id.toString() !== currentUserId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (invitation.status !== 'pending') {
      return res
        .status(400)
        .json({ message: `Cannot accept an invitation with status "${invitation.status}"` });
    }


    const team = await Team.findById(invitation.team._id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const existingMemberIds = team.members.map(m => m.toString());
    const toIdString   = invitation.to._id.toString();
    const fromIdString = invitation.from._id.toString();

    let userToAddId;
 
    if (!existingMemberIds.includes(toIdString)) {
    
      userToAddId = invitation.to._id;
    } else {

      userToAddId = invitation.from._id;
    }


    const userDoc = await User.findById(userToAddId);
    if (!userDoc) {
      return res.status(404).json({ message: 'User to add not found' });
    }
    if (userDoc.teamId) {
      return res
        .status(400)
        .json({ message: 'This user is already a member of another team.' });
    }

    team.members.push(userToAddId);
    await team.save();

 
    invitation.status = 'accepted';
    await invitation.save();


    await User.findByIdAndUpdate(userToAddId, { teamId: team._id });

    return res.json({ message: 'Invitation accepted and user added to team' });
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

