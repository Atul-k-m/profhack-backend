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

// Helper function to check if department belongs to a group (matching frontend logic)
const isDepartmentInGroup = (department, groupDepartments) => {
  if (!department) return false;
  
  return groupDepartments.some(groupDept => {
    // Exact match (case insensitive)
    if (groupDept.toLowerCase() === department.toLowerCase()) return true;
    
    // Contains match
    if (department.toLowerCase().includes(groupDept.toLowerCase())) return true;
    
    // Special cases for abbreviations (matching frontend logic)
    if (groupDept === 'Computer Science & Engineering' && department.includes('innovation')) return true;
    if (groupDept === 'Information Science & Engineering' && department.includes('ISE')) return true;
    if (groupDept === 'Electrical & Electronics Engineering' && department.includes('EEE')) return true;
    if (groupDept === 'Electronics & Communication Engineering' && department.includes('ECE')) return true;
    
    return false;
  });
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

    // Rule 3: Check group constraints (updated to match frontend logic)
    const innovationCount = allMembers.filter(m => 
      isDepartmentInGroup(m.department, DEPARTMENT_GROUPS.innovation)
    ).length;
    
    const structuralCount = allMembers.filter(m => 
      isDepartmentInGroup(m.department, DEPARTMENT_GROUPS.structural)
    ).length;
    
    const foundationCount = allMembers.filter(m => 
      isDepartmentInGroup(m.department, DEPARTMENT_GROUPS.foundation)
    ).length;

    // Updated validation rules to match frontend
    if (foundationCount !== 1) {
      errors.push(`Must have exactly 1 foundation group member (currently ${foundationCount})`);
    }
    
    if (structuralCount < 1) {
      errors.push(`Must have at least 1 structural group member (currently ${structuralCount})`);
    }
    if (structuralCount > 2) {
      errors.push(`Too many structural group members (${structuralCount}/2 max)`);
    }
    
    if (innovationCount < 2) {
      errors.push(`Must have at least 2 innovation group members (currently ${innovationCount})`);
    }
    if (innovationCount > 3) {
      errors.push(`Too many innovation group members (${innovationCount}/3 max)`);
    }

    // Rule 4: Check gender composition - at least 2 female and at least 2 male
    const membersWithoutGender = allMembers.filter(m => !m.gender);
    if (membersWithoutGender.length > 0) {
      const names = membersWithoutGender.map(m => m.name).join(', ');
      errors.push(`Gender information missing for: ${names}. Please update profiles before creating team.`);
    } else {
      const femaleMembers = allMembers.filter(m => {
        const gender = normalizeGender(m.gender);
        return gender === 'F';
      });
      
      const maleMembers = allMembers.filter(m => {
        const gender = normalizeGender(m.gender);
        return gender === 'M';
      });
      
      if (femaleMembers.length < 2) {
        errors.push(`Team must have at least 2 female members (currently ${femaleMembers.length})`);
      }
      
      if (maleMembers.length < 2) {
        errors.push(`Team must have at least 2 male members (currently ${maleMembers.length})`);
      }
    }

    // Optional: Log for debugging
    console.log('Team composition validation:', {
      totalMembers: allMembers.length,
      femaleCount: allMembers.filter(m => normalizeGender(m.gender) === 'F').length,
      maleCount: allMembers.filter(m => normalizeGender(m.gender) === 'M').length,
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