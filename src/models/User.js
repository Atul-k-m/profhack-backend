import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  designation: { type: String, required: true },
  department: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  skills: { type: String, required: true },
  experience: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema);