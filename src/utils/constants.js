import dotenv from 'dotenv';
dotenv.config();

// constants.js - Updated with password reset constants

export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

export const MAX_OTP_ATTEMPTS = parseInt(process.env.MAX_OTP_ATTEMPTS) || 3;
export const OTP_EXPIRES_IN = parseInt(process.env.OTP_EXPIRES_IN) || 5 * 60 * 1000; // 5 minutes
export const OTP_COOLDOWN_TIME = parseInt(process.env.OTP_COOLDOWN_TIME) || 60 * 1000; // 1 minute

// Password reset token expires in 1 hour
export const PASSWORD_RESET_TOKEN_EXPIRES = parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRES) || 60 * 60 * 1000; // 1 hour

// Email configuration
export const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
export const EMAIL_PORT = parseInt(process.env.EMAIL_PORT) || 587;
export const EMAIL_USER = process.env.EMAIL_USER;
export const EMAIL_PASS = process.env.EMAIL_PASS;

// Frontend URL for password reset links
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';