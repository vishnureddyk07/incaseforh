export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface EmergencyInfo {
  fullName: string;
  email: string;
  bloodType: string;
  emergencyContacts: EmergencyContact[];
  allergies: string;
  medications: string;
  medicalConditions: string;
  photo?: File | string | null;
  dateOfBirth: string;
  address: string;
  phoneNumber: string;
  alternateNumber1?: string;
  alternateNumber2?: string;
}