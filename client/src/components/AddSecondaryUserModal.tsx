import React, { useState } from 'react';
import type { EmergencyContact, EmergencyInfo } from '../types/emergency';
import EmergencyForm from './emergency/EmergencyForm';

interface AddSecondaryUserModalProps {
  uuid: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

const createEmptyProfile = (): EmergencyInfo => ({
  fullName: '',
  email: '',
  bloodType: '',
  emergencyContacts: [{ name: '', phone: '' }],
  allergies: '',
  medications: '',
  medicalConditions: '',
  photo: null,
  bloodTypeReport: null,
  prescriptionOrDischargeReport: null,
  surgicalInfoReport: null,
  dateOfBirth: '',
  address: '',
  phoneNumber: '',
});

export default function AddSecondaryUserModal({ uuid, isOpen, onClose, onSuccess }: AddSecondaryUserModalProps) {
  const [emergencyInfo, setEmergencyInfo] = useState<EmergencyInfo>(createEmptyProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setEmergencyInfo((previous) => ({ ...previous, [name]: value }));
  };

  const handlePhotoChange = (file: File) => {
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setError('Profile photo is too large. Maximum size is 10 MB.');
      return;
    }
    setEmergencyInfo((previous) => ({ ...previous, photo: file }));
    setError('');
  };

  const handleFileChange = (field: 'bloodTypeReport' | 'prescriptionOrDischargeReport' | 'surgicalInfoReport', file: File | null) => {
    if (file && file.size > MAX_UPLOAD_SIZE_BYTES) {
      setError('Uploaded files must be 10 MB or smaller.');
      return;
    }
    setEmergencyInfo((previous) => ({ ...previous, [field]: file }));
    setError('');
  };

  const handleAddContact = () => {
    setEmergencyInfo((previous) => ({
      ...previous,
      emergencyContacts: previous.emergencyContacts.length < 5
        ? [...previous.emergencyContacts, { name: '', phone: '' }]
        : previous.emergencyContacts,
    }));
  };

  const handleRemoveContact = (index: number) => {
    setEmergencyInfo((previous) => ({
      ...previous,
      emergencyContacts: previous.emergencyContacts.length > 1
        ? previous.emergencyContacts.filter((_, contactIndex) => contactIndex !== index)
        : previous.emergencyContacts,
    }));
  };

  const handleContactChange = (index: number, field: 'name' | 'phone', value: string) => {
    setEmergencyInfo((previous) => ({
      ...previous,
      emergencyContacts: previous.emergencyContacts.map((contact, contactIndex) => (
        contactIndex === index ? { ...contact, [field]: value } : contact
      )),
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!emergencyInfo.fullName.trim() || !emergencyInfo.phoneNumber.trim() || !emergencyInfo.bloodType) {
      setError('Full name, phone number, and blood group are required.');
      return;
    }

    const validContacts = emergencyInfo.emergencyContacts.filter((contact) => contact.name.trim() && contact.phone.trim());
    if (validContacts.length === 0) {
      setError('At least one complete emergency contact is required.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('fullName', emergencyInfo.fullName.trim());
      formData.append('phoneNumber', emergencyInfo.phoneNumber.trim());
      formData.append('dateOfBirth', emergencyInfo.dateOfBirth || '');
      formData.append('bloodType', emergencyInfo.bloodType);
      formData.append('email', emergencyInfo.email || '');
      formData.append('address', emergencyInfo.address || '');
      formData.append('allergies', emergencyInfo.allergies || '');
      formData.append('medications', emergencyInfo.medications || '');
      formData.append('medicalConditions', emergencyInfo.medicalConditions || '');
      formData.append('emergencyContacts', JSON.stringify(validContacts));
      if (emergencyInfo.photo instanceof File) formData.append('photo', emergencyInfo.photo);
      if (emergencyInfo.bloodTypeReport instanceof File) formData.append('bloodTypeReport', emergencyInfo.bloodTypeReport);
      if (emergencyInfo.prescriptionOrDischargeReport instanceof File) formData.append('prescriptionOrDischargeReport', emergencyInfo.prescriptionOrDischargeReport);
      if (emergencyInfo.surgicalInfoReport instanceof File) formData.append('surgicalInfoReport', emergencyInfo.surgicalInfoReport);

      const apiBase = (import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com').replace(/\/+$/, '');
      const response = await fetch(`${apiBase}/api/v1/qr/${encodeURIComponent(uuid)}/profiles`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add profile');

      setEmergencyInfo(createEmptyProfile());
      onSuccess();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to add profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
      <div className="mx-auto my-6 max-w-4xl rounded-2xl bg-slate-50 p-6 shadow-2xl">
        <h3 className="mb-1 text-lg font-bold text-gray-900">Add Complete Profile</h3>
        <p className="mb-4 text-xs text-gray-500">This profile uses the same emergency information form and remains linked to the same QR code.</p>
        <form onSubmit={submit}>
          <EmergencyForm
            emergencyInfo={emergencyInfo}
            onChange={handleChange}
            onPhotoChange={handlePhotoChange}
            onBloodTypeReportChange={(file) => handleFileChange('bloodTypeReport', file)}
            onPrescriptionOrDischargeReportChange={(file) => handleFileChange('prescriptionOrDischargeReport', file)}
            onSurgicalInfoReportChange={(file) => handleFileChange('surgicalInfoReport', file)}
            onAddEmergencyContact={handleAddContact}
            onRemoveEmergencyContact={handleRemoveContact}
            onEmergencyContactChange={handleContactChange}
          />
          {error ? <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={loading} className="rounded border px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white">{loading ? 'Saving...' : 'Save / Add Profile'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
