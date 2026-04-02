import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type EmergencyContact = {
  name: string;
  phone: string;
};

type EmergencyInfo = {
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

type StickerPayload = {
  uuid: string;
  serialNumber: string;
  status: string;
  type: string;
};

export default function AdminQRReassign() {
  const { uuid = '' } = useParams();
  const navigate = useNavigate();
  const { token, user, isAuthenticated } = useAuth();
  const backendApiBaseUrl = import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [sticker, setSticker] = useState<StickerPayload | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [address, setAddress] = useState('');
  const [contacts, setContacts] = useState<EmergencyContact[]>([{ name: '', phone: '' }]);
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [bloodTypeReportDataUrl, setBloodTypeReportDataUrl] = useState('');
  const [prescriptionOrDischargeReportDataUrl, setPrescriptionOrDischargeReportDataUrl] = useState('');
  const [surgicalInfoReportDataUrl, setSurgicalInfoReportDataUrl] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [bloodTypeReportFile, setBloodTypeReportFile] = useState<File | null>(null);
  const [prescriptionOrDischargeReportFile, setPrescriptionOrDischargeReportFile] = useState<File | null>(null);
  const [surgicalInfoReportFile, setSurgicalInfoReportFile] = useState<File | null>(null);

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token || ''}`, 'Content-Type': 'application/json' }),
    [token]
  );

  const readApiPayload = async (res: Response) => {
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    const text = await res.text();
    return {
      error: text?.trim()
        ? `Unexpected server response: ${text.slice(0, 120)}`
        : 'Unexpected server response',
    };
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      navigate('/admin');
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (!token || !uuid) return;

    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${backendApiBaseUrl}/api/v1/admin/qr/reassign/${encodeURIComponent(uuid)}`, {
          headers: authHeaders,
        });
        const data = await readApiPayload(res);
        if (!res.ok) throw new Error(data.error || 'Failed to load profile');
        if (!active) return;

        const s = data?.sticker || null;
        const info = (data?.emergencyInfo || {}) as EmergencyInfo;

        setSticker(
          s
            ? {
                uuid: s.uuid,
                serialNumber: s.serialNumber,
                status: s.status,
                type: s.type,
              }
            : null
        );

        setProfileId(info._id || null);
        setFullName(info.fullName || '');
        setEmail(info.email || '');
        setPhoneNumber(info.phoneNumber || '');
        setDateOfBirth(info.dateOfBirth || '');
        setBloodType(info.bloodType || '');
        setAllergies(info.allergies || '');
        setMedications(info.medications || '');
        setMedicalConditions(info.medicalConditions || '');
        setAddress(info.address || '');
        setPhotoDataUrl(info.photo || '');
        setBloodTypeReportDataUrl(info.bloodTypeReport || '');
        setPrescriptionOrDischargeReportDataUrl(info.prescriptionOrDischargeReport || '');
        setSurgicalInfoReportDataUrl(info.surgicalInfoReport || '');

        const existingContacts = Array.isArray(info.emergencyContacts)
          ? info.emergencyContacts.filter((c) => c && (c.name || c.phone)).map((c) => ({ name: c.name || '', phone: c.phone || '' }))
          : [];
        setContacts(existingContacts.length > 0 ? existingContacts : [{ name: '', phone: '' }]);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [backendApiBaseUrl, authHeaders, token, uuid]);

  const updateContact = (idx: number, key: keyof EmergencyContact, value: string) => {
    setContacts((prev) => prev.map((c, i) => (i === idx ? { ...c, [key]: value } : c)));
  };

  const addContact = () => {
    setContacts((prev) => (prev.length >= 5 ? prev : [...prev, { name: '', phone: '' }]));
  };

  const removeContact = (idx: number) => {
    setContacts((prev) => {
      const filtered = prev.filter((_, i) => i !== idx);
      return filtered.length > 0 ? filtered : [{ name: '', phone: '' }];
    });
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !uuid) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const emergencyContacts = contacts
        .map((c) => ({ name: c.name.trim(), phone: c.phone.trim() }))
        .filter((c) => c.name || c.phone);

      const payload = new FormData();
      payload.append('fullName', fullName);
      payload.append('email', email);
      payload.append('phoneNumber', phoneNumber);
      payload.append('dateOfBirth', dateOfBirth);
      payload.append('bloodType', bloodType);
      payload.append('allergies', allergies);
      payload.append('medications', medications);
      payload.append('medicalConditions', medicalConditions);
      payload.append('address', address);
      payload.append('emergencyContacts', JSON.stringify(emergencyContacts));

      if (photoFile) {
        payload.append('photo', photoFile);
      } else {
        payload.append('photo', photoDataUrl);
      }

      if (bloodTypeReportFile) {
        payload.append('bloodTypeReport', bloodTypeReportFile);
      } else {
        payload.append('bloodTypeReport', bloodTypeReportDataUrl);
      }

      if (prescriptionOrDischargeReportFile) {
        payload.append('prescriptionOrDischargeReport', prescriptionOrDischargeReportFile);
      } else {
        payload.append('prescriptionOrDischargeReport', prescriptionOrDischargeReportDataUrl);
      }

      if (surgicalInfoReportFile) {
        payload.append('surgicalInfoReport', surgicalInfoReportFile);
      } else {
        payload.append('surgicalInfoReport', surgicalInfoReportDataUrl);
      }

      const res = await fetch(`${backendApiBaseUrl}/api/v1/admin/qr/reassign/${encodeURIComponent(uuid)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token || ''}` },
        body: payload,
      });
      const data = await readApiPayload(res);
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');

      setProfileId(data?.emergencyInfo?._id || profileId);
      setSuccess('Profile updated successfully.');
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-neutral-600">Loading profile...</div>;
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setPhotoDataUrl(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen section bg-neutral-50">
      <div className="container-lg card-elevated p-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Reassign Sticker Profile</h1>
            <p className="text-sm text-neutral-600 mt-1">
              Serial: <span className="font-semibold">{sticker?.serialNumber || '—'}</span>
              {' '}| Status: <span className="font-semibold uppercase">{sticker?.status || '—'}</span>
              {' '}| UUID: <span className="font-mono text-xs">{sticker?.uuid || uuid}</span>
            </p>
            {profileId ? <p className="text-xs text-neutral-500">Profile ID: {profileId}</p> : null}
          </div>
          <Link to="/admin/dashboard" className="btn-secondary-sm">
            Back to Dashboard
          </Link>
        </div>

        {error ? <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</p> : null}

        <form onSubmit={onSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="input" />
            <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone Number" className="input" />
          </div>

          <div className="space-y-2 rounded-xl border border-neutral-200 p-4">
            <p className="font-semibold text-neutral-700">Emergency Contacts</p>
            {contacts.map((c, idx) => (
              <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <input
                  value={c.name}
                  onChange={(e) => updateContact(idx, 'name', e.target.value)}
                  placeholder="Name"
                  className="input"
                />
                <input
                  value={c.phone}
                  onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                  placeholder="Phone"
                  className="input"
                />
                <button type="button" onClick={() => removeContact(idx)} className="btn-danger-sm">
                  Remove
                </button>
              </div>
            ))}
            <button type="button" onClick={addContact} className="btn-secondary-sm">
              + Add Contact
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-neutral-200 p-4">
            <p className="font-semibold text-neutral-700">Photo</p>
            {photoDataUrl ? (
              <img
                src={photoDataUrl}
                alt="Profile preview"
                className="h-36 w-36 rounded-lg object-cover border border-neutral-200"
              />
            ) : (
              <p className="text-sm text-neutral-500">No photo uploaded yet.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="input max-w-sm"
                title="Upload profile photo"
                aria-label="Upload profile photo"
              />
              {photoDataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setPhotoDataUrl('');
                    setPhotoFile(null);
                  }}
                  className="btn-secondary-sm"
                >
                  Remove Photo
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-neutral-200 p-4">
            <p className="font-semibold text-neutral-700">Medical Documents (Optional)</p>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Blood Group Result</label>
              <div className="flex flex-wrap gap-2">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setBloodTypeReportFile(e.target.files?.[0] || null)}
                  className="input max-w-sm"
                  title="Upload blood group result"
                  aria-label="Upload blood group result"
                />
                {bloodTypeReportDataUrl ? (
                  <a href={bloodTypeReportDataUrl} target="_blank" rel="noreferrer" className="btn-secondary-sm">Open Existing</a>
                ) : null}
                {(bloodTypeReportDataUrl || bloodTypeReportFile) ? (
                  <button type="button" onClick={() => { setBloodTypeReportDataUrl(''); setBloodTypeReportFile(null); }} className="btn-secondary-sm">Remove</button>
                ) : null}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Prescription / Discharge Report</label>
              <div className="flex flex-wrap gap-2">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setPrescriptionOrDischargeReportFile(e.target.files?.[0] || null)}
                  className="input max-w-sm"
                  title="Upload prescription or discharge report"
                  aria-label="Upload prescription or discharge report"
                />
                {prescriptionOrDischargeReportDataUrl ? (
                  <a href={prescriptionOrDischargeReportDataUrl} target="_blank" rel="noreferrer" className="btn-secondary-sm">Open Existing</a>
                ) : null}
                {(prescriptionOrDischargeReportDataUrl || prescriptionOrDischargeReportFile) ? (
                  <button type="button" onClick={() => { setPrescriptionOrDischargeReportDataUrl(''); setPrescriptionOrDischargeReportFile(null); }} className="btn-secondary-sm">Remove</button>
                ) : null}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Surgical Info / Report</label>
              <div className="flex flex-wrap gap-2">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setSurgicalInfoReportFile(e.target.files?.[0] || null)}
                  className="input max-w-sm"
                  title="Upload surgical info report"
                  aria-label="Upload surgical info report"
                />
                {surgicalInfoReportDataUrl ? (
                  <a href={surgicalInfoReportDataUrl} target="_blank" rel="noreferrer" className="btn-secondary-sm">Open Existing</a>
                ) : null}
                {(surgicalInfoReportDataUrl || surgicalInfoReportFile) ? (
                  <button type="button" onClick={() => { setSurgicalInfoReportDataUrl(''); setSurgicalInfoReportFile(null); }} className="btn-secondary-sm">Remove</button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} className="input" title="Blood type" aria-label="Blood type">
              <option value="">Blood Type</option>
              <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
              <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
            </select>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input" />
            <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="input" title="Date of birth" aria-label="Date of birth" />
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className="input" />
          </div>

          <textarea value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Allergies" className="input" rows={2} />
          <textarea value={medications} onChange={(e) => setMedications(e.target.value)} placeholder="Medications" className="input" rows={2} />
          <textarea value={medicalConditions} onChange={(e) => setMedicalConditions(e.target.value)} placeholder="Medical Conditions" className="input" rows={2} />

          <div className="flex gap-3">
            <button disabled={saving} type="submit" className="btn-primary-md disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            <Link to="/admin/dashboard" className="btn-secondary-md">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
