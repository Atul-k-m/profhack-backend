// otpService.js - Updated with password reset functionality

import { OTP_EXPIRES_IN, PASSWORD_RESET_TOKEN_EXPIRES } from '../utils/constants.js';

// In-memory storage for OTPs and password reset tokens
const otpStore = new Map();
const passwordResetStore = new Map();

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const storeOTP = (email, otp) => {
  const expires = Date.now() + OTP_EXPIRES_IN;
  otpStore.set(email, {
    otp,
    expires,
    attempts: 0,
    verified: false
  });
  return expires;
};

export const getOTPData = (email) => {
  return otpStore.get(email);
};

export const deleteOTP = (email) => {
  otpStore.delete(email);
};

export const incrementAttempts = (email) => {
  const data = otpStore.get(email);
  if (data) {
    data.attempts += 1;
    otpStore.set(email, data);
  }
};

export const markAsVerified = (email) => {
  const data = otpStore.get(email);
  if (data) {
    data.verified = true;
    otpStore.set(email, data);
  }
};

// Password Reset Token Functions
export const storePasswordResetToken = (email, token) => {
  const expires = Date.now() + PASSWORD_RESET_TOKEN_EXPIRES;
  passwordResetStore.set(email, {
    token,
    expires,
    createdAt: Date.now()
  });
  return expires;
};

export const getPasswordResetData = (email) => {
  return passwordResetStore.get(email);
};

export const deletePasswordResetToken = (email) => {
  passwordResetStore.delete(email);
};

// Clean up expired tokens periodically
setInterval(() => {
  const now = Date.now();
  
  // Clean expired OTPs
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expires) {
      otpStore.delete(email);
    }
  }
  
  // Clean expired password reset tokens
  for (const [email, data] of passwordResetStore.entries()) {
    if (now > data.expires) {
      passwordResetStore.delete(email);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes