import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Index for faster queries
teamSchema.index({ leader: 1 });
teamSchema.index({ members: 1 });
teamSchema.index({ teamName: 1 });

const Team = mongoose.model('Team', teamSchema);
export default Team;

// utils/teamValidation.js
import User from '../models/User.js';

// Department categorization based on your frontend
const DEPARTMENT_GROUPS = {
  core: ['Physics', 'Chemistry', 'Mathematics', 'MBA', 'Humanities and Social Science'],
  engineering: ['Mechanical Engineering', 'Civil Engineering', 'EEE', 'ECE', 'ETC'],
  cse: ['CSE', 'ISE', 'AI&ML', 'CSBS', 'MCA']
};

export const validateTeamComposition = async (leaderDepartment, memberIds) => {
  const errors = [];
  
  try {
    // Get member details from database
    const members = await User.find({ _id: { $in: memberIds } }).select('department name');
    
    if (members.length !== memberIds.length) {
      errors.push('Some selected members were not found');
      return { isValid: false, errors };
    }

    // Include leader in validation
    const allMembers = [{ department: leaderDepartment }, ...members];
    
    // Rule 1: Check total count (5 members including leader)
    if (allMembers.length !== 5) {
      errors.push(`Team must have exactly 5 members (currently ${allMembers.length})`);
    }

    // Rule 2: Check unique departments
    const departments = allMembers.map(m => m.department);
    const uniqueDepartments = new Set(departments);
    if (uniqueDepartments.size !== departments.length) {
      errors.push('All team members must be from different departments');
    }

    // Rule 3: Check group constraints
    const cseCount = allMembers.filter(m => DEPARTMENT_GROUPS.cse.includes(m.department)).length;
    const engineeringCount = allMembers.filter(m => DEPARTMENT_GROUPS.engineering.includes(m.department)).length;
    const coreCount = allMembers.filter(m => DEPARTMENT_GROUPS.core.includes(m.department)).length;

    if (cseCount > 2) {
      errors.push(`Too many CSE group members (${cseCount}/2 max)`);
    }
    if (engineeringCount > 2) {
      errors.push(`Too many Engineering group members (${engineeringCount}/2 max)`);
    }
    if (coreCount > 1) {
      errors.push(`Too many Core group members (${coreCount}/1 max)`);
    }

    return { isValid: errors.length === 0, errors };
  } catch (error) {
    console.error('Team validation error:', error);
    return { isValid: false, errors: ['Failed to validate team composition'] };
  }
};

export const checkExistingTeamMembership = async (userIds) => {
  try {
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