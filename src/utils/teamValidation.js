import User from '../models/User.js';
import Team from '../models/Team.js';

// Department categorization based on your frontend
const DEPARTMENT_GROUPS = {
  foundation: [
    'Physics', 
    'Chemistry', 
    'Mathematics', 
    'Master of Business Administration', 
    'Humanities and Social Science',
    'Humanities & Social Science'
  ],
  structural: [
    'Mechanical Engineering', 
    'Civil Engineering', 
    'Electrical & Electronics Engineering',
    'Electronics & Communication Engineering', 
    'Electronics & Telecommunication Engineering'
  ],
  innovation: [
    'Computer Science & Engineering',
    'Information Science & Engineering', 
    'Artificial Intelligence and Machine Learning',
    'Computer Science and Business Systems', 
    'Master of Computer Applications',
    // Keep abbreviations as fallback
    'innovation', 'ISE', 'AI&ML', 'CSBS'
  ]
};


// Helper function to normalize gender
const normalizeGender = (gender) => {
  if (!gender) return null;
  const normalized = gender.toString().toUpperCase();
  return normalized === 'MALE' ? 'M' : normalized === 'FEMALE' ? 'F' : normalized;
};

export const validateTeamComposition = async (leaderDepartment, memberIds, leaderId) => {
  const errors = [];
  
  try {
    // Get member details from database
    const members = await User.find({ _id: { $in: memberIds } }).select('department name gender');
    
    if (members.length !== memberIds.length) {
      errors.push('Some selected members were not found');
      return { isValid: false, errors };
    }

    // Get leader details
    const leader = await User.findById(leaderId).select('department name gender');
    if (!leader) {
      errors.push('Team leader not found');
      return { isValid: false, errors };
    }

    // Include leader in validation
    const allMembers = [
      { 
        department: leader.department, 
        name: leader.name, 
        gender: normalizeGender(leader.gender) || leader.gender 
      }, 
      ...members.map(m => ({ 
        department: m.department, 
        name: m.name, 
        gender: normalizeGender(m.gender) || m.gender 
      }))
    ];
    
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
    const innovationCount = allMembers.filter(m => DEPARTMENT_GROUPS.innovation.includes(m.department)).length;
    const structuralCount = allMembers.filter(m => DEPARTMENT_GROUPS.structural.includes(m.department)).length;
    const foundationCount = allMembers.filter(m => DEPARTMENT_GROUPS.foundation.includes(m.department)).length;

    if (innovationCount > 2) {
      errors.push(`Too many innovation group members (${innovationCount}/2 max)`);
    }
    if (structuralCount > 2) {
      errors.push(`Too many structural group members (${structuralCount}/2 max)`);
    }
    if (foundationCount > 1) {
      errors.push(`Too many foundation group members (${foundationCount}/1 max)`);
    }

    // Rule 4: Check gender composition - minimum 2 female teachers
    const membersWithGender = allMembers.filter(m => m.gender); // Only members with gender set
    const femaleMembers = allMembers.filter(m => {
      const gender = normalizeGender(m.gender);
      return gender === 'F';
    });
    
    // Check if all members have gender information
    const membersWithoutGender = allMembers.filter(m => !m.gender);
    if (membersWithoutGender.length > 0) {
      const names = membersWithoutGender.map(m => m.name).join(', ');
      errors.push(`Gender information missing for: ${names}. Please update profiles before creating team.`);
    } else if (femaleMembers.length < 2) {
      errors.push(`Team must have at least 2 female teachers (currently ${femaleMembers.length})`);
    }

    // Optional: Log for debugging
    console.log('Team composition validation:', {
      totalMembers: allMembers.length,
      membersWithGender: membersWithGender.length,
      femaleCount: femaleMembers.length,
      innovationCount,
      structuralCount,
      foundationCount,
      departments: departments,
      membersWithoutGender: membersWithoutGender.map(m => m.name)
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