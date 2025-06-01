const otpStorage = new Map();

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const storeOTP = (email, otp) => {
  const expires = Date.now() + 5 * 60 * 1000; 
  otpStorage.set(email, { 
    otp, 
    expires, 
    attempts: 0,
    verified: false 
  });
  return expires;
};

export const getOTPData = (email) => {
  return otpStorage.get(email);
};

export const deleteOTP = (email) => {
  otpStorage.delete(email);
};

export const incrementAttempts = (email) => {
  const data = otpStorage.get(email);
  if (data) {
    data.attempts++;
  }
};

export const markAsVerified = (email) => {
  const data = otpStorage.get(email);
  if (data) {
    data.verified = true;
  }
};