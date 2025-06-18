import User from '../models/User.js';

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      name,
      username,
      email,
      designation,
      department,
      avatarUrl,
      bio,
      skills,
      experience
    } = req.body;

    const updateData = {};
    if (name        !== undefined) updateData.name = name;
    if (username    !== undefined) updateData.username = username;
    if (email       !== undefined) updateData.email = email;
    if (designation !== undefined) updateData.designation = designation;
    if (department  !== undefined) updateData.department = department;
    if (avatarUrl   !== undefined) updateData.avatarUrl = avatarUrl;
    if (bio         !== undefined) updateData.bio = bio;

    if (skills !== undefined) {
      updateData.skills = Array.isArray(skills)
        ? skills.join(', ')
        : skills;
    }


    if (experience !== undefined) {
      const expNum = Number(experience);
      if (Number.isNaN(expNum)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid value for experience'
        });
      }
      updateData.experience = expNum;
    }

    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} "${error.keyValue[field]}" is already in use.`
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

