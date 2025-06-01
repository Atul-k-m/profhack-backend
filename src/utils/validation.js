export const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validateRegistrationData = (data) => {
  const errors = [];
  
  if (!data.username || data.username.trim().length < 3) {
    errors.push('Username must be at least 3 characters long');
  }
  
  if (!data.password || data.password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Please enter a valid email address');
  }
  
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  return errors;
};