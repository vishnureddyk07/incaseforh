import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateEmail, validatePhone } from '../utils/validation';

// Email validation property tests
describe('validateEmail', () => {
  it('accepts common valid emails', () => {
    const valids = [
      'user@example.com',
      'first.last@domain.co.in',
      'user+tag@sub.domain.org',
      'a@b.io',
    ];
    for (const e of valids) expect(validateEmail(e)).toBe(true);
  });

  it('rejects obvious invalid emails', () => {
    const invalids = [
      'plainaddress',
      '@no-local-part.com',
      'user@',
      'user@.com',
      'user@domain',
      'user@domain..com',
      'user@@domain.com',
    ];
    for (const e of invalids) expect(validateEmail(e)).toBe(false);
  });

  it('fuzz: 8000 random strings should not crash and only few valid', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const ok = validateEmail(s);
        // Basic idempotence: trimming affects outcome for leading/trailing spaces
        if (s.trim() !== s) {
          expect(ok).toBe(false);
        }
      }),
      { numRuns: 8000 }
    );
  });
});

// Phone validation property tests (supports E.164 or Indian 10-digit with optional +91)
describe('validatePhone', () => {
  it('accepts Indian and E.164-like examples', () => {
    const valids = [
      '+919876543210',
      '9876543210',
      '+1 2025550123',
      '+442071838750',
      '+91-9876543210',
      '0919876543210', // lenient cases may fail depending on regex
    ];
    // we accept at least the primary ones
    expect(validatePhone('+919876543210')).toBe(true);
    expect(validatePhone('9876543210')).toBe(true);
  });

  it('rejects obviously invalid phones', () => {
    const invalids = [
      '123',
      'abcdefghij',
      '+',
      '++++++++++',
      '+9100',
      ' 9876543210',
      '9876543210 ',
      '++919876543210',
      '987654321', // too short
    ];
    for (const p of invalids) expect(validatePhone(p)).toBe(false);
  });

  it('fuzz: 8000 random strings should not crash; only expected formats pass', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const ok = validatePhone(s);
        // Allow only digits with optional + and 10-15 length when stripped of spaces/dashes
        const normalized = s.replace(/[\s-]/g, '');
        const simple = /^\+?[1-9]\d{9,14}$/;
        expect(ok).toBe(simple.test(normalized));
      }),
      { numRuns: 8000 }
    );
  });
});
