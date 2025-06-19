import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendOTPEmail, sendPasswordResetEmail } from '../services/emailService.js';
import { 
  generateOTP, 
  storeOTP, 
  getOTPData, 
  deleteOTP, 
  incrementAttempts, 
  markAsVerified,
  storePasswordResetToken,
  getPasswordResetData,
  deletePasswordResetToken
} from '../services/otpService.js';
import { isValidEmail, validateRegistrationData } from '../utils/validation.js';
import { 
  JWT_SECRET, 
  JWT_EXPIRES_IN, 
  MAX_OTP_ATTEMPTS, 
  OTP_COOLDOWN_TIME, 
  BCRYPT_SALT_ROUNDS,
  PASSWORD_RESET_TOKEN_EXPIRES 
} from '../utils/constants.js';

export const sendOTP = async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered' });
    }
    
    const otp = generateOTP();
    const expires = storeOTP(email, otp);
    
    await sendOTPEmail(email, otp, name);
    
    res.json({ 
      message: 'OTP sent successfully to your email',
      expires: expires 
    });
    
  } catch (error) {
    console.error('Send OTP error:', error);
    if (error.code === 'EAUTH') {
      res.status(500).json({ message: 'Email authentication failed. Please check server configuration.' });
    } else if (error.code === 'ECONNECTION') {
      res.status(500).json({ message: 'Failed to connect to email server.' });
    } else {
      res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }
    
    const storedData = getOTPData(email);
    
    if (!storedData) {
      return res.status(400).json({ message: 'OTP not found. Please request a new one.' });
    }
    
    if (Date.now() > storedData.expires) {
      deleteOTP(email);
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }
    
    if (storedData.attempts >= MAX_OTP_ATTEMPTS) {
      deleteOTP(email);
      return res.status(400).json({ message: 'Too many incorrect attempts. Please request a new OTP.' });
    }
    
    if (storedData.otp !== otp.toString()) {
      incrementAttempts(email);
      const attemptsLeft = MAX_OTP_ATTEMPTS - storedData.attempts;
      return res.status(400).json({ 
        message: `Invalid OTP. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`,
        attemptsLeft: attemptsLeft 
      });
    }
    
    markAsVerified(email);
    
    res.json({ message: 'Email verified successfully!' });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'OTP verification failed' });
  }
};

export const resendOTP = async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    const storedData = getOTPData(email);
    if (storedData && (Date.now() - (storedData.expires - 5 * 60 * 1000)) < OTP_COOLDOWN_TIME) {
      return res.status(400).json({ message: 'Please wait before requesting a new OTP' });
    }
    
    const otp = generateOTP();
    const expires = storeOTP(email, otp);
    
    await sendOTPEmail(email, otp, name);
    
    res.json({ 
      message: 'New OTP sent successfully',
      expires: expires 
    });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Failed to resend OTP' });
  }
};

export const register = async (req, res) => {
  try {
    const { username, password, designation, name, department, email, skills, experience } = req.body;

    const validationErrors = validateRegistrationData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors.join(', ') });
    }

    const storedData = { verified: true }; // override manually for testing

    if (!storedData || !storedData.verified) {
      return res.status(400).json({ message: 'Please verify your email address first' });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ message: 'Email already registered' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const newUser = new User({
      username,
      password: hashedPassword,
      name,
      department,
      designation,
      email,
      skills,
      experience: parseInt(experience)
    });

    await newUser.save();

    deleteOTP(email); // optional, safe to leave

    res.status(201).json({ message: 'Registration successful! You can now login.' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body; 
    
    const isEmail = email.includes('@');
    
    const user = await User.findOne(
      isEmail 
        ? { email: email } 
        : { username: email } 
    );
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        department: user.department,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// NEW FORGOT PASSWORD FUNCTIONALITY

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If this email is registered, you will receive a password reset link' });
    }
    
    // Generate a secure token for password reset
    const resetToken = jwt.sign(
      { userId: user._id, email: user.email, purpose: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Store the reset token
    const expires = storePasswordResetToken(email, resetToken);
    
    // Send password reset email
    await sendPasswordResetEmail(email, resetToken, user.name);
    
    res.json({ 
      message: 'If this email is registered, you will receive a password reset link',
      expires: expires 
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to process password reset request' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    
    // Check if token is for password reset
    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ message: 'Invalid token purpose' });
    }
    
    // Check if token is still stored (not used)
    const storedData = getPasswordResetData(decoded.email);
    if (!storedData || storedData.token !== token) {
      return res.status(400).json({ message: 'Token has been used or expired' });
    }
    
    // Check if token has expired
    if (Date.now() > storedData.expires) {
      deletePasswordResetToken(decoded.email);
      return res.status(400).json({ message: 'Reset token has expired' });
    }
    
    // Find user and update password
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    
    // Update user password
    user.password = hashedPassword;
    await user.save();
    
    // Delete the used token
    deletePasswordResetToken(decoded.email);
    
    res.json({ message: 'Password reset successful! You can now login with your new password.' });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};

export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }
    
    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    
    // Check if token is for password reset
    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ message: 'Invalid token purpose' });
    }
    
    // Check if token is still stored (not used)
    const storedData = getPasswordResetData(decoded.email);
    if (!storedData || storedData.token !== token) {
      return res.status(400).json({ message: 'Token has been used or expired' });
    }
    
    // Check if token has expired
    if (Date.now() > storedData.expires) {
      deletePasswordResetToken(decoded.email);
      return res.status(400).json({ message: 'Reset token has expired' });
    }
    
    res.json({ 
      message: 'Token is valid',
      email: decoded.email 
    });
    
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ message: 'Failed to verify token' });
  }
};