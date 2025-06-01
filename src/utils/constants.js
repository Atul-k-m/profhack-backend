import dotenv from 'dotenv';
dotenv.config();
export const JWT_SECRET = process.env.JWT_SECRET ;
export const JWT_EXPIRES_IN = '24000h';
export const OTP_EXPIRY_TIME = 5 * 60 * 1000;
export const MAX_OTP_ATTEMPTS = 3;
export const OTP_COOLDOWN_TIME = 60 * 1000; 
export const BCRYPT_SALT_ROUNDS = 10;