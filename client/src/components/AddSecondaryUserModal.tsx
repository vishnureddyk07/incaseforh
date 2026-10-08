import { useState } from 'react';
import EmergencyForm from './emergency/EmergencyForm';
import type { EmergencyInfo } from '../types/emergency';

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

const createEmptyProfile = (): EmergencyInfo => ({
  fullName: '', email: '', bloodType: '', emergencyContacts: [{ name: '', phone: '' }],
  allergies: '', medications: '', medicalConditions: '', photo: null,
  bloodTypeReport: null, prescriptionOrDischargeReport: null, surgicalInfoReport: null,
  dateOfBirth: '', address: '', phoneNumber: '',
});

interface Props {
  uuid: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSecondaryUserModal({ uuid, isOpen, onClose, onSuccess }: Props) {
  const [profile, setProfile] = useState<EmergencyInfo>(createEmptyProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const apiBase = (import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com').replace(/\/+$/, '');

  if (!isOpen) return null;

  const onChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };

  const setFile = (field: 'photo' | 'bloodTypeReport' | 'prescriptionOrDischargeReport' | 'surgicalInfoReport', file: File | null) => {
    if (file && file.size > MAX_UPLOAD_SIZE_BYTES) {
      setError('Uploaded files must be 10 MB or smaller.');
      return;
    }
    setProfile((current) => ({ ...current, [field]: file }));
    setError('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const contacts = profile.emergencyContacts.filter((contact) => contact.name.trim() && contact.phone.trim());
    if (!profile.fullName.trim() || !profile.phoneNumber.trim() || !profile.dateOfBirth || !profile.bloodType || contacts.length === 0) {
      setError('Name, phone, date of birth, blood group, and one emergency contact are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      for (const field of ['fullName', 'phoneNumber', 'dateOfBirth', 'bloodType', 'email', 'address', 'allergies', 'medications', 'medicalConditions'] as const) {
        formData.append(field, profile[field] || '');
      }
      formData.append('emergencyContacts', JSON.stringify(contacts));
      if (profile.photo instanceof File) formData.append('photo', profile.photo);
      if (profile.bloodTypeReport instanceof File) formData.append('bloodTypeReport', profile.bloodTypeReport);
      if (profile.prescriptionOrDischargeReport instanceof File) formData.append('prescriptionOrDischargeReport', profile.prescriptionOrDischargeReport);
      if (profile.surgicalInfoReport instanceof File) formData.append('surgicalInfoReport', profile.surgicalInfoReport);
      const response = await fetch(`${apiBase}/api/v1/qr/${encodeURIComponent(uuid)}/profiles`, { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add profile');
      setProfile(createEmptyProfile());
      onSuccess();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to add profile');
    } finally {
      setLoading(false);
    }
  };

  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
    <div className="mx-auto my-6 max-w-4xl rounded-2xl bg-slate-50 p-6 shadow-2xl">
      <h2 className="mb-1 text-lg font-bold">Add Complete Profile</h2>
      <p className="mb-4 text-sm text-slate-600">Complete every section, including photo, medical history, reports, and emergency contacts.</p>
      <form onSubmit={submit}>
        <EmergencyForm
          emergencyInfo={profile}
          onChange={onChange}
          onPhotoChange={(file) => setFile('photo', file)}
          onBloodTypeReportChange={(file) => setFile('bloodTypeReport', file)}
          onPrescriptionOrDischargeReportChange={(file) => setFile('prescriptionOrDischargeReport', file)}
          onSurgicalInfoReportChange={(file) => setFile('surgicalInfoReport', file)}
          onAddEmergencyContact={() => setProfile((current) => ({ ...current, emergencyContacts: [...current.emergencyContacts, { name: '', phone: '' }] }))}
          onRemoveEmergencyContact={(index) => setProfile((current) => ({ ...current, emergencyContacts: current.emergencyContacts.filter((_, currentIndex) => currentIndex !== index) }))}
          onEmergencyContactChange={(index, field, value) => setProfile((current) => ({ ...current, emergencyContacts: current.emergencyContacts.map((contact, currentIndex) => currentIndex === index ? { ...contact, [field]: value } : contact) }))}
        />
        {error ? <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={loading} className="rounded border px-4 py-2">Cancel</button>
          <button type="submit" disabled={loading} className="rounded bg-indigo-600 px-4 py-2 font-medium text-white">{loading ? 'Saving...' : 'Save / Add Profile'}</button>
        </div>
      </form>
    </div>
  </div>;
}
