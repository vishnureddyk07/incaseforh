import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle, FileText, Image, Plus, Trash2, Upload } from 'lucide-react';

type EmergencyContact = {
  name: string;
  phone: string;
};

type ProfileData = {
  _id?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  bloodType?: string;
  allergies?: string;
  medications?: string;
  medicalConditions?: string;
  address?: string;
  emergencyContacts?: EmergencyContact[];
  photo?: string;
  bloodTypeReport?: string;
  prescriptionOrDischargeReport?: string;
  surgicalInfoReport?: string;
};

const apiBase = import.meta.env.VITE_API_URL
  || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://incaseforh.onrender.com');

const parseJsonSafe = async (response: Response) => {
  const responseText = await response.text();
  if (!responseText) return {};
  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error('Server returned non-JSON response. Please check the backend is running.');
  }
};

export default function ChatBotEditProfile() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData>({});
  const [contacts, setContacts] = useState<EmergencyContact[]>([{ name: '', phone: '' }]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [bloodTypeReportFile, setBloodTypeReportFile] = useState<File | null>(null);
  const [prescriptionReportFile, setPrescriptionReportFile] = useState<File | null>(null);
  const [surgicalReportFile, setSurgicalReportFile] = useState<File | null>(null);

  useEffect(() => {
    const savedToken = sessionStorage.getItem('chatbotEditToken') || '';
    if (!savedToken) {
      navigate('/chatbot', { replace: true });
      return;
    }
    setToken(savedToken);
  }, [navigate]);

  useEffect(() => {
    if (!token) return;

    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${apiBase}/api/v1/chatbot/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await parseJsonSafe(response);
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load profile');
        }

        if (!active) return;
        setProfile(data);
        setContacts(
          Array.isArray(data.emergencyContacts) && data.emergencyContacts.length > 0
            ? data.emergencyContacts.map((contact) => ({ name: contact.name || '', phone: contact.phone || '' }))
            : [{ name: '', phone: '' }]
        );
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Failed to load profile';
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [token]);

  const updateContact = (index: number, field: keyof EmergencyContact, value: string) => {
    setContacts((prev) => prev.map((contact, currentIndex) => (currentIndex === index ? { ...contact, [field]: value } : contact)));
  };

  const addContact = () => {
    setContacts((prev) => [...prev, { name: '', phone: '' }]);
  };

  const removeContact = (index: number) => {
    setContacts((prev) => {
      const next = prev.filter((_, currentIndex) => currentIndex !== index);
      return next.length > 0 ? next : [{ name: '', phone: '' }];
    });
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('fullName', profile.fullName || '');
      formData.append('phoneNumber', profile.phoneNumber || '');
      formData.append('email', profile.email || '');
      formData.append('dateOfBirth', profile.dateOfBirth || '');
      formData.append('bloodType', profile.bloodType || '');
      formData.append('allergies', profile.allergies || '');
      formData.append('medications', profile.medications || '');
      formData.append('medicalConditions', profile.medicalConditions || '');
      formData.append('address', profile.address || '');
      formData.append('emergencyContacts', JSON.stringify(contacts.filter((contact) => contact.name || contact.phone)));

      if (photoFile) formData.append('photo', photoFile);
      if (bloodTypeReportFile) formData.append('bloodTypeReport', bloodTypeReportFile);
      if (prescriptionReportFile) formData.append('prescriptionOrDischargeReport', prescriptionReportFile);
      if (surgicalReportFile) formData.append('surgicalInfoReport', surgicalReportFile);

      const response = await fetch(`${apiBase}/api/v1/chatbot/profile`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await parseJsonSafe(response);
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setSuccess('Profile updated successfully.');
      sessionStorage.removeItem('chatbotEditToken');
      setTimeout(() => navigate('/chatbot', { replace: true }), 800);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 grid place-items-center text-neutral-600">
        Loading profile editor...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-amber-600 font-semibold">Chatbot Profile Editor</p>
            <h1 className="text-3xl font-bold text-neutral-900">Update Your Emergency Profile</h1>
            <p className="mt-2 text-sm text-neutral-600">This opens after OTP verification so you can edit everything on a dedicated page.</p>
          </div>
          <Link to="/chatbot" className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" /> {success}
          </div>
        )}

        <form onSubmit={onSave} className="grid gap-6">
          <section className="card-elevated p-6">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">Basic Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <input className="input" value={profile.fullName || ''} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} placeholder="Full Name" />
              <input className="input" value={profile.phoneNumber || ''} onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })} placeholder="Phone Number" />
              <input className="input" value={profile.email || ''} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="Email" />
              <input className="input" type="date" aria-label="Date of Birth" value={profile.dateOfBirth || ''} onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })} />
              <input className="input" value={profile.bloodType || ''} onChange={(e) => setProfile({ ...profile, bloodType: e.target.value })} placeholder="Blood Type" />
              <input className="input" value={profile.address || ''} onChange={(e) => setProfile({ ...profile, address: e.target.value })} placeholder="Address" />
            </div>
          </section>

          <section className="card-elevated p-6">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">Medical Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <textarea className="input min-h-24" value={profile.allergies || ''} onChange={(e) => setProfile({ ...profile, allergies: e.target.value })} placeholder="Allergies" />
              <textarea className="input min-h-24" value={profile.medications || ''} onChange={(e) => setProfile({ ...profile, medications: e.target.value })} placeholder="Medications" />
              <textarea className="input min-h-24 md:col-span-2" value={profile.medicalConditions || ''} onChange={(e) => setProfile({ ...profile, medicalConditions: e.target.value })} placeholder="Medical Conditions" />
            </div>
          </section>

          <section className="card-elevated p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">Emergency Contacts</h2>
              <button type="button" onClick={addContact} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600">
                <Plus className="h-4 w-4" /> Add Contact
              </button>
            </div>
            <div className="space-y-3">
              {contacts.map((contact, index) => (
                <div key={`${index}-${contact.name}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <input className="input" value={contact.name} onChange={(e) => updateContact(index, 'name', e.target.value)} placeholder="Contact Name" />
                  <input className="input" value={contact.phone} onChange={(e) => updateContact(index, 'phone', e.target.value)} placeholder="Contact Phone" />
                  <button type="button" onClick={() => removeContact(index)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="card-elevated p-6">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">Documents & Photo</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 rounded-xl border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-700">
                <span className="inline-flex items-center gap-2 font-medium"><Image className="h-4 w-4" /> Profile Photo</span>
                <input type="file" accept="image/*" aria-label="Profile Photo" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
              </label>
              <label className="flex flex-col gap-2 rounded-xl border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-700">
                <span className="inline-flex items-center gap-2 font-medium"><FileText className="h-4 w-4" /> Blood Type Report</span>
                <input type="file" accept="image/*,.pdf" aria-label="Blood Type Report" onChange={(e) => setBloodTypeReportFile(e.target.files?.[0] || null)} />
              </label>
              <label className="flex flex-col gap-2 rounded-xl border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-700">
                <span className="inline-flex items-center gap-2 font-medium"><FileText className="h-4 w-4" /> Prescription/Discharge Report</span>
                <input type="file" accept="image/*,.pdf" aria-label="Prescription or Discharge Report" onChange={(e) => setPrescriptionReportFile(e.target.files?.[0] || null)} />
              </label>
              <label className="flex flex-col gap-2 rounded-xl border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-700">
                <span className="inline-flex items-center gap-2 font-medium"><FileText className="h-4 w-4" /> Surgical Info Report</span>
                <input type="file" accept="image/*,.pdf" aria-label="Surgical Info Report" onChange={(e) => setSurgicalReportFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          </section>

          <div className="flex items-center justify-end gap-3">
            <Link to="/chatbot" className="rounded-lg border border-neutral-200 bg-white px-5 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100">Cancel</Link>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60">
              <Upload className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
