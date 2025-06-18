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
  gender: { 
    type: String, 
    required: false, // Not required during registration
    enum: ['M', 'F', 'Male', 'Female'],
    validate: {
      validator: function(value) {
        // Allow empty/null values since it's manually added later
        if (!value) return true;
        return ['M', 'F', 'Male', 'Female'].includes(value);
      },
      message: 'Gender must be M, F, Male, or Female'
    }
  },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  createdAt: { type: Date, default: Date.now }
});

// Helper method to normalize gender values
userSchema.methods.getNormalizedGender = function() {
  const gender = this.gender.toUpperCase();
  return gender === 'MALE' ? 'M' : gender === 'FEMALE' ? 'F' : gender;
};

const User = mongoose.model('User', userSchema);

export default User;