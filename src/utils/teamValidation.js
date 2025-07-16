import User from '../models/User.js';
import Team from '../models/Team.js';

export const validateTeamComposition = async (memberIds, leaderId) => {
  const errors = [];
  
  try {
    // Get member details from database
    const members = await User.find({ _id: { $in: memberIds } }).select('name');
    
    if (members.length !== memberIds.length) {
      errors.push('Some selected members were not found');
      return { isValid: false, errors };
    }

    // Get leader details
    const leader = await User.findById(leaderId).select('name');
    if (!leader) {
      errors.push('Team leader not found');
      return { isValid: false, errors };
    }

    // Include leader in validation
    const allMembers = [leader, ...members];
    
    // Rule 1: Check total count (5 members including leader)
    if (allMembers.length !== 5) {
      errors.push(`Team must have exactly 5 members (currently ${allMembers.length})`);
    }

    // Optional: Log for debugging
    console.log('Team composition validation:', {
      totalMembers: allMembers.length,
      memberNames: allMembers.map(m => m.name)
    });

    return { isValid: errors.length === 0, errors };
  } catch (error) {
    console.error('Team validation error:', error);
    return { isValid: false, errors: ['Failed to validate team composition'] };
  }
};

export const checkExistingTeamMembership = async (userIds) => {
  try {
    // Check if any user is already in a team (as leader or member)
    const existingTeams = await Team.find({
      $or: [
        { leader: { $in: userIds } },
        { members: { $in: userIds } }
      ]
    }).populate('leader', 'name').populate('members', 'name');

    const conflicts = [];
    for (const team of existingTeams) {
      for (const userId of userIds) {
        if (team.leader._id.toString() === userId.toString()) {
          conflicts.push(`${team.leader.name} is already a team leader of "${team.teamName}"`);
        } else if (team.members.some(member => member._id.toString() === userId.toString())) {
          const memberName = team.members.find(m => m._id.toString() === userId.toString()).name;
          conflicts.push(`${memberName} is already a member of "${team.teamName}"`);
        }
      }
    }

    return { hasConflicts: conflicts.length > 0, conflicts };
  } catch (error) {
    console.error('Error checking team membership:', error);
    return { hasConflicts: true, conflicts: ['Failed to check existing memberships'] };
  }
};