export type ProfileContact = { name: string; phone: string };

export const normalizePhoneForComparison = (value: string) => value.replace(/\D/g, '');

export const validateEmergencyProfile = (profile: {
  fullName: string;
  phoneNumber: string;
  dateOfBirth: string;
  bloodType: string;
  emergencyContacts: ProfileContact[];
}): string | null => {
  if (!profile.fullName.trim() || !profile.phoneNumber.trim() || !profile.dateOfBirth || !profile.bloodType) {
    return 'Name, phone, date of birth, blood group, and one emergency contact are required.';
  }

  const contacts = profile.emergencyContacts.filter((contact) => contact.name.trim() && contact.phone.trim());
  if (contacts.length === 0) {
    return 'Name, phone, date of birth, blood group, and one emergency contact are required.';
  }
  if (contacts.length > 5) {
    return 'You can add up to 5 emergency contacts.';
  }

  const contactPhones = contacts.map((contact) => normalizePhoneForComparison(contact.phone)).filter(Boolean);
  if (new Set(contactPhones).size !== contactPhones.length) {
    return 'Emergency contact phone numbers must be unique.';
  }
  if (contactPhones.includes(normalizePhoneForComparison(profile.phoneNumber))) {
    return 'Your phone number and emergency contact number cannot be the same.';
  }

  return null;
};
