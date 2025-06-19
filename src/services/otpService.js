// services/otpService.js - Updated with password reset functionality
import { OTP_EXPIRES_IN, PASSWORD_RESET_TOKEN_EXPIRES } from '../utils/constants.js';

// In-memory storage for OTPs and password reset tokens
// In production, consider using Redis or a database
const otpStorage = new Map();
const passwordResetStorage = new Map();

// OTP Functions
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const storeOTP = (email, otp) => {
  const expires = Date.now() + OTP_EXPIRES_IN;
  otpStorage.set(email, {
    otp: otp,
    expires: expires,
    attempts: 0,
    verified: false
  });
  
  // Auto cleanup after expiry
  setTimeout(() => {
    if (otpStorage.has(email)) {
      const data = otpStorage.get(email);
      if (Date.now() > data.expires) {
        otpStorage.delete(email);
      }
    }
  }, OTP_EXPIRES_IN + 1000);
  
  return expires;
};

export const getOTPData = (email) => {
  return otpStorage.get(email) || null;
};

export const deleteOTP = (email) => {
  return otpStorage.delete(email);
};

export const incrementAttempts = (email) => {
  const data = otpStorage.get(email);
  if (data) {
    data.attempts += 1;
    otpStorage.set(email, data);
  }
};

export const markAsVerified = (email) => {
  const data = otpStorage.get(email);
  if (data) {
    data.verified = true;
    otpStorage.set(email, data);
    
    // Keep verified status for 10 minutes to allow registration
    setTimeout(() => {
      deleteOTP(email);
    }, 10 * 60 * 1000);
  }
};

// Password Reset Functions
export const storePasswordResetToken = (email, token) => {
  const expires = Date.now() + PASSWORD_RESET_TOKEN_EXPIRES;
  passwordResetStorage.set(email, {
    token: token,
    expires: expires,
    used: false
  });
  
  // Auto cleanup after expiry
  setTimeout(() => {
    if (passwordResetStorage.has(email)) {
      const data = passwordResetStorage.get(email);
      if (Date.now() > data.expires) {
        passwordResetStorage.delete(email);
      }
    }
  }, PASSWORD_RESET_TOKEN_EXPIRES + 1000);
  
  return expires;
};

export const getPasswordResetData = (email) => {
  return passwordResetStorage.get(email) || null;
};

export const deletePasswordResetToken = (email) => {
  return passwordResetStorage.delete(email);
};

export const markTokenAsUsed = (email) => {
  const data = passwordResetStorage.get(email);
  if (data) {
    data.used = true;
    passwordResetStorage.set(email, data);
  }
};

// Utility function to clean up expired entries
export const cleanupExpiredEntries = () => {
  const now = Date.now();
  
  // Clean OTPs
  for (const [email, data] of otpStorage.entries()) {
    if (now > data.expires) {
      otpStorage.delete(email);
    }
  }
  
  // Clean password reset tokens
  for (const [email, data] of passwordResetStorage.entries()) {
    if (now > data.expires) {
      passwordResetStorage.delete(email);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

// Export storage for debugging (remove in production)
export const getStorageStats = () => {
  return {
    otpCount: otpStorage.size,
    passwordResetCount: passwordResetStorage.size,
    otpEntries: Array.from(otpStorage.keys()),
    passwordResetEntries: Array.from(passwordResetStorage.keys())
  };
};