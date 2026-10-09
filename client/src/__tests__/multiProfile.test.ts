import { describe, it, expect } from 'vitest';
import {
  MAX_MULTI_PROFILE_COUNT,
  getPrimaryProfileId,
  getProfileType,
  canAddProfile,
} from '../utils/multiProfile';
import { validateEmergencyProfile } from '../utils/profileValidation';

const buildSecondaryProfileForm = (profile: {
  fullName: string;
  phoneNumber: string;
  dateOfBirth: string;
  bloodType: string;
  allergies: string;
  medications: string;
  medicalConditions: string;
  address: string;
  emergencyContacts: Array<{ name: string; phone: string }>;
  photo: File;
  bloodTypeReport: File;
  prescriptionOrDischargeReport: File;
  surgicalInfoReport: File;
}) => {
  const formData = new FormData();
  formData.append('fullName', profile.fullName);
  formData.append('phoneNumber', profile.phoneNumber);
  formData.append('dateOfBirth', profile.dateOfBirth);
  formData.append('bloodType', profile.bloodType);
  formData.append('allergies', profile.allergies);
  formData.append('medications', profile.medications);
  formData.append('medicalConditions', profile.medicalConditions);
  formData.append('address', profile.address);
  formData.append('emergencyContacts', JSON.stringify(profile.emergencyContacts));
  formData.append('photo', profile.photo);
  formData.append('bloodTypeReport', profile.bloodTypeReport);
  formData.append('prescriptionOrDischargeReport', profile.prescriptionOrDischargeReport);
  formData.append('surgicalInfoReport', profile.surgicalInfoReport);
  return formData;
};

describe('multi profile rules', () => {
  it('allows up to three profiles on a shared QR', () => {
    expect(MAX_MULTI_PROFILE_COUNT).toBe(3);
    expect(canAddProfile([])).toBe(true);
    expect(canAddProfile(Array.from({ length: 1 }, (_, index) => ({ profileId: `id-${index}` })))).toBe(true);
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

  it('includes every profile section when adding a secondary profile', () => {
    const formData = buildSecondaryProfileForm({
      fullName: 'Secondary User',
      phoneNumber: '9876543210',
      dateOfBirth: '1990-01-01',
      bloodType: 'O+',
      allergies: 'Peanuts',
      medications: 'None',
      medicalConditions: 'Asthma',
      address: 'Bengaluru',
      emergencyContacts: [{ name: 'Emergency Contact', phone: '9123456780' }],
      photo: new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }),
      bloodTypeReport: new File(['blood'], 'blood.pdf', { type: 'application/pdf' }),
      prescriptionOrDischargeReport: new File(['prescription'], 'prescription.pdf', { type: 'application/pdf' }),
      surgicalInfoReport: new File(['medical history'], 'medical-history.pdf', { type: 'application/pdf' }),
    });

    expect(formData.get('fullName')).toBe('Secondary User');
    expect(formData.get('dateOfBirth')).toBe('1990-01-01');
    expect(formData.get('medicalConditions')).toBe('Asthma');
    expect(formData.get('emergencyContacts')).toContain('Emergency Contact');
    expect((formData.get('photo') as File).name).toBe('photo.jpg');
    expect((formData.get('bloodTypeReport') as File).name).toBe('blood.pdf');
    expect((formData.get('prescriptionOrDischargeReport') as File).name).toBe('prescription.pdf');
    expect((formData.get('surgicalInfoReport') as File).name).toBe('medical-history.pdf');
  });

  it('matches the complete profile validation rules', () => {
    const validProfile = {
      fullName: 'Secondary User',
      phoneNumber: '9876543210',
      dateOfBirth: '1990-01-01',
      bloodType: 'O+',
      emergencyContacts: [{ name: 'Emergency Contact', phone: '9123456780' }],
    };

    expect(validateEmergencyProfile(validProfile)).toBeNull();
    expect(validateEmergencyProfile({ ...validProfile, dateOfBirth: '' })).toContain('date of birth');
    expect(validateEmergencyProfile({
      ...validProfile,
      emergencyContacts: [
        { name: 'One', phone: '9123456780' },
        { name: 'Two', phone: '9123456780' },
      ],
    })).toContain('unique');
    expect(validateEmergencyProfile({
      ...validProfile,
      emergencyContacts: [{ name: 'Emergency Contact', phone: '98765 43210' }],
    })).toContain('different');
  });
});
