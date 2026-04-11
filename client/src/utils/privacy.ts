export const maskPhoneNumber = (phone?: string | null): string => {
  const raw = String(phone || '').trim();
  if (!raw) return 'Hidden';

  const digits = raw.replace(/\D/g, '');
  if (!digits) return 'Hidden';

  const visibleDigits = digits.slice(-2);
  const hiddenPart = '*'.repeat(Math.max(digits.length - 2, 4));
  return `${hiddenPart}${visibleDigits}`;
};
