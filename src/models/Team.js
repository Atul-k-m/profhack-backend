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
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  memberNames: [{
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
 
    if (this.leader && (!this.leaderName || this.isModified('leader'))) {
      const leader = await mongoose.model('User').findById(this.leader).select('name');
      if (leader) {
        this.leaderName = leader.name;
      }
    }

    if (this.members && this.members.length > 0 && (!this.memberNames || this.memberNames.length === 0 || this.isModified('members'))) {
      const members = await mongoose.model('User').find({ 
        _id: { $in: this.members } 
      }).select('name');
      
     
      this.memberNames = this.members.map(memberId => {
        const member = members.find(m => m._id.toString() === memberId.toString());
        return member ? member.name : 'Unknown User';
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
    
    if (update.leader) {
      const leader = await mongoose.model('User').findById(update.leader).select('name');
      if (leader) {
        update.leaderName = leader.name;
      }
    }

    if (update.members && update.members.length > 0) {
      const members = await mongoose.model('User').find({ 
        _id: { $in: update.members } 
      }).select('name');
      
      update.memberNames = update.members.map(memberId => {
        const member = members.find(m => m._id.toString() === memberId.toString());
        return member ? member.name : 'Unknown User';
      });
    }

    next();
  } catch (error) {
    next(error);
  }
});

teamSchema.index({ leader: 1 });
teamSchema.index({ members: 1 });
teamSchema.index({ teamName: 1 });
teamSchema.index({ leaderName: 1 }); 
teamSchema.index({ memberNames: 1 }); 

const Team = mongoose.model('Team', teamSchema);
export default Team;