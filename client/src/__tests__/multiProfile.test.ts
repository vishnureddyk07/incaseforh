import { describe, it, expect } from 'vitest';
import {
  MAX_MULTI_PROFILE_COUNT,
  getPrimaryProfileId,
  getProfileType,
  canAddProfile,
} from '../utils/multiProfile';

describe('multi profile rules', () => {
  it('allows up to three profiles on a shared QR', () => {
    expect(MAX_MULTI_PROFILE_COUNT).toBe(3);
    expect(canAddProfile([])).toBe(true);
    expect(canAddProfile(Array.from({ length: 2 }, (_, index) => ({ profileId: `id-${index}` })))).toBe(true);
    expect(canAddProfile(Array.from({ length: 3 }, (_, index) => ({ profileId: `id-${index}` })))).toBe(false);
  });

  it('marks the first profile as primary and later ones as secondary', () => {
    const profiles = [
      { profileId: 'p1', profileType: 'PRIMARY' },
      { profileId: 'p2' },
      { profileId: 'p3' },
    ];

    expect(getPrimaryProfileId(profiles)).toBe('p1');
    expect(getProfileType(profiles, 'p1')).toBe('PRIMARY');
    expect(getProfileType(profiles, 'p2')).toBe('SECONDARY');
    expect(getProfileType(profiles, 'p3')).toBe('SECONDARY');
  });
});
