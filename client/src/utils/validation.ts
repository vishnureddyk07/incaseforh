export const validateEmail = (emailAddress: string): boolean => {
  const sanitizedEmail = emailAddress.trim();
  // Basic but robust: must have one @, a dot in domain, no consecutive dots
  const emailValidationPattern = /^(?!.*\.{2})[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailValidationPattern.test(sanitizedEmail);
};

export const validatePhone = (phoneNumber: string): boolean => {
  return /^\d{10}$/.test(phoneNumber);
};