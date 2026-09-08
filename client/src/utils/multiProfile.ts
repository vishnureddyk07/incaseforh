export const MAX_MULTI_PROFILE_COUNT = 3;

export type ProfileRole = 'PRIMARY' | 'SECONDARY';

export type MultiProfileRecord = {
  profileId: string;
  profileType?: ProfileRole;
};

export const getPrimaryProfileId = (profiles: MultiProfileRecord[] = []): string | null => {
  const primary = profiles.find((profile) => profile.profileType === 'PRIMARY');
  return primary ? primary.profileId : profiles[0]?.profileId ?? null;
};

export const getProfileType = (profiles: MultiProfileRecord[] = [], profileId: string): ProfileRole => {
  const match = profiles.find((profile) => profile.profileId === profileId);
  if (match?.profileType === 'PRIMARY') return 'PRIMARY';
  return match ? 'SECONDARY' : 'SECONDARY';
};

export const canAddProfile = (profiles: MultiProfileRecord[] = []): boolean => {
  return profiles.length < MAX_MULTI_PROFILE_COUNT;
};
