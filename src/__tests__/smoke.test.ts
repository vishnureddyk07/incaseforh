import { describe, it, expect } from 'vitest';

describe('Simple validation check (no React)', () => {
  it('basic smoke test', () => {
    expect(1 + 1).toBe(2);
  });

  it('checks that phone validation exists', async () => {
    const { validatePhone } = await import('../utils/validation');
    expect(typeof validatePhone).toBe('function');
    expect(validatePhone('9876543210')).toBe(true);
    expect(validatePhone('abc')).toBe(false);
  });

  it('checks that email validation exists', async () => {
    const { validateEmail } = await import('../utils/validation');
    expect(typeof validateEmail).toBe('function');
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid')).toBe(false);
  });
});
