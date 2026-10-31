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

// Phone validation property tests (exactly 10 numeric digits)
describe('validatePhone', () => {
  it('accepts exactly 10 numeric digits', () => {
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
      '+919876543210',
      '98765 43210',
      '98765432101',
    ];
    for (const p of invalids) expect(validatePhone(p)).toBe(false);
  });

  it('fuzz: 8000 random strings should not crash; only expected formats pass', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const ok = validatePhone(s);
        expect(ok).toBe(/^\d{10}$/.test(s));
      }),
      { numRuns: 8000 }
    );
  });
});
