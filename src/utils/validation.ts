export const validateEmail = (emailAddress: string): boolean => {
  const sanitizedEmail = emailAddress.trim();
  // Basic but robust: must have one @, a dot in domain, no consecutive dots
  const emailValidationPattern = /^(?!.*\.{2})[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailValidationPattern.test(sanitizedEmail);
};

export const validatePhone = (phoneNumber: string): boolean => {
  // Accept E.164-like formats and common Indian numbers
  // First trim to reject leading/trailing spaces
  const sanitizedPhone = phoneNumber.trim();
  if (sanitizedPhone !== phoneNumber) return false; // Reject if had leading/trailing spaces
  // Normalize by removing spaces and dashes
  const normalizedPhoneFormat = sanitizedPhone.replace(/[\s-]/g, '');
  const extractedDigitsOnly = normalizedPhoneFormat.replace(/^\+/, '');
  // Explicit length check: 10–15 digits
  if (extractedDigitsOnly.length < 10 || extractedDigitsOnly.length > 15) return false;
  // Must start with non-zero
  if (!/^\+?[1-9]/.test(normalizedPhoneFormat)) return false;
  // Only digits after optional +
  if (!/^\+?\d+$/.test(normalizedPhoneFormat)) return false;
  // Reject repeated digits sequences (e.g., all zeros)
  if (/(\d)\1{9,14}$/.test(extractedDigitsOnly)) return false;
  return true;
};