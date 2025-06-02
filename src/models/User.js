import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  maxMembers: { type: Number, default: 5 },
  skills: { type: String },
  isPrivate: { type: Boolean, default: false },
  status: { type: String, enum: ['Active', 'Recruiting', 'Full'], default: 'Recruiting' },
  isEligible: { type: Boolean, default: false },
  eligibilityDetails: {
    coreDepartments: { count: Number, required: Boolean, fulfilled: Boolean },
    engineeringDepartments: { count: Number, required: Boolean, fulfilled: Boolean },
    cseDepartments: { count: Number, required: Boolean, fulfilled: Boolean }
  },
  createdAt: { type: Date, default: Date.now }
});

// Invitation Schema
const invitationSchema = new mongoose.Schema({
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: { type: String },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  designation: { type: String, required: true },
  department: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  skills: { type: String, required: true },
  experience: { type: Number, required: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Team = mongoose.model('Team', teamSchema);
const Invitation = mongoose.model('Invitation', invitationSchema);

export { User, Team, Invitation };
export default User;