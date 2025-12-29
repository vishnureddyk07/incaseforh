export const validateEmail = (email: string): boolean => {
  const trimmed = email.trim();
  // Basic but robust: must have one @, a dot in domain, no consecutive dots
  const emailRegex = /^(?!.*\.{2})[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
};

export const validatePhone = (phone: string): boolean => {
  // Accept E.164-like formats and common Indian numbers
  // First trim to reject leading/trailing spaces
  const trimmed = phone.trim();
  if (trimmed !== phone) return false; // Reject if had leading/trailing spaces
  // Normalize by removing spaces and dashes
  const normalized = trimmed.replace(/[\s-]/g, '');
  const digitsOnly = normalized.replace(/^\+/, '');
  // Explicit length check: 10–15 digits
  if (digitsOnly.length < 10 || digitsOnly.length > 15) return false;
  // Must start with non-zero
  if (!/^\+?[1-9]/.test(normalized)) return false;
  // Only digits after optional +
  if (!/^\+?\d+$/.test(normalized)) return false;
  // Reject repeated digits sequences (e.g., all zeros)
  if (/^(\d)\1{9,14}$/.test(digitsOnly)) return false;
  return true;
};