export interface EmergencyInfo {
  fullName: string;
  email: string;
  bloodType: string;
  emergencyContact: string;
  allergies: string;
  medications: string;
  medicalConditions: string;
  photo?: File | null;
  dateOfBirth: string;
  address: string;
  phoneNumber: string;
  alternateNumber1: string;
  alternateNumber2: string;
}