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
  leaderName: {
    type: String,
  },
  leaderDepartment: {
    type: String,
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  memberNames: [{
    type: String,
  }],
  memberDepartments: [{
    type: String,
  }],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

teamSchema.pre('save', async function(next) {
  try {
    // Handle leader name and department
    if (this.leader && (!this.leaderName || !this.leaderDepartment || this.isModified('leader'))) {
      const leader = await mongoose.model('User').findById(this.leader).select('name department');
      if (leader) {
        this.leaderName = leader.name;
        this.leaderDepartment = leader.department;
      }
    }

    // Handle member names and departments
    if (this.members && this.members.length > 0 && 
        (!this.memberNames || this.memberNames.length === 0 || 
         !this.memberDepartments || this.memberDepartments.length === 0 || 
         this.isModified('members'))) {
      
      const members = await mongoose.model('User').find({ 
        _id: { $in: this.members } 
      }).select('name department');
      
      // Map names in the same order as member IDs
      this.memberNames = this.members.map(memberId => {
        const member = members.find(m => m._id.toString() === memberId.toString());
        return member ? member.name : 'Unknown User';
      });

      // Map departments in the same order as member IDs
      this.memberDepartments = this.members.map(memberId => {
        const member = members.find(m => m._id.toString() === memberId.toString());
        return member ? member.department : 'Unknown Department';
      });
    }

    next();
  } catch (error) {
    next(error);
  }
});

teamSchema.pre('findOneAndUpdate', async function(next) {
  try {
    const update = this.getUpdate();
    
    // Handle leader update
    if (update.leader) {
      const leader = await mongoose.model('User').findById(update.leader).select('name department');
      if (leader) {
        update.leaderName = leader.name;
        update.leaderDepartment = leader.department;
      }
    }

    // Handle members update
    if (update.members && update.members.length > 0) {
      const members = await mongoose.model('User').find({ 
        _id: { $in: update.members } 
      }).select('name department');
      
      update.memberNames = update.members.map(memberId => {
        const member = members.find(m => m._id.toString() === memberId.toString());
        return member ? member.name : 'Unknown User';
      });

      update.memberDepartments = update.members.map(memberId => {
        const member = members.find(m => m._id.toString() === memberId.toString());
        return member ? member.department : 'Unknown Department';
      });
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Indexes
teamSchema.index({ leader: 1 });
teamSchema.index({ members: 1 });
teamSchema.index({ teamName: 1 });
teamSchema.index({ leaderName: 1 }); 
teamSchema.index({ leaderDepartment: 1 }); 
teamSchema.index({ memberNames: 1 }); 
teamSchema.index({ memberDepartments: 1 }); 

const Team = mongoose.model('Team', teamSchema);
export default Team;