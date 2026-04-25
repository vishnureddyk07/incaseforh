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
  const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
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
  const [photoTouched, setPhotoTouched] = useState(false);
  const [bloodTypeReportTouched, setBloodTypeReportTouched] = useState(false);
  const [prescriptionReportTouched, setPrescriptionReportTouched] = useState(false);
  const [surgicalReportTouched, setSurgicalReportTouched] = useState(false);

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
        setPhotoTouched(false);
        setBloodTypeReportTouched(false);
        setPrescriptionReportTouched(false);
        setSurgicalReportTouched(false);

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
      } else if (photoTouched) {
        payload.append('photo', photoDataUrl);
      }

      if (bloodTypeReportFile) {
        payload.append('bloodTypeReport', bloodTypeReportFile);
      } else if (bloodTypeReportTouched) {
        payload.append('bloodTypeReport', bloodTypeReportDataUrl);
      }

      if (prescriptionOrDischargeReportFile) {
        payload.append('prescriptionOrDischargeReport', prescriptionOrDischargeReportFile);
      } else if (prescriptionReportTouched) {
        payload.append('prescriptionOrDischargeReport', prescriptionOrDischargeReportDataUrl);
      }

      if (surgicalInfoReportFile) {
        payload.append('surgicalInfoReport', surgicalInfoReportFile);
      } else if (surgicalReportTouched) {
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
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setError('Uploaded photo is too large. Maximum allowed size is 5 MB.');
      e.target.value = '';
      return;
    }

    setError(null);
    setPhotoTouched(true);
    setPhotoFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setPhotoDataUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleReportFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setTouched: (value: boolean) => void,
    setFile: (value: File | null) => void,
    label: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setError(`${label} is too large. Maximum allowed size is 5 MB.`);
      e.target.value = '';
      return;
    }

    setError(null);
    setTouched(true);
    setFile(file);
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

        {loading ? (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Loading profile data...
          </div>
        ) : null}

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
                    setPhotoTouched(true);
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
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-start">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleReportFileChange(e, setBloodTypeReportTouched, setBloodTypeReportFile, 'Uploaded blood group report')}
                  className="input w-full xl:max-w-sm"
                  title="Upload blood group result"
                  aria-label="Upload blood group result"
                />
                <div className="flex flex-wrap items-center gap-2">
                  {bloodTypeReportDataUrl ? (
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-2">
                      <a href={bloodTypeReportDataUrl} target="_blank" rel="noreferrer" className="btn-secondary-sm">Open Existing</a>
                    </div>
                  ) : null}
                  {(bloodTypeReportDataUrl || bloodTypeReportFile) ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-2">
                      <button type="button" onClick={() => { setBloodTypeReportTouched(true); setBloodTypeReportDataUrl(''); setBloodTypeReportFile(null); }} className="btn-danger-sm">Remove</button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Prescription / Discharge Report</label>
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-start">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleReportFileChange(e, setPrescriptionReportTouched, setPrescriptionOrDischargeReportFile, 'Uploaded prescription/discharge report')}
                  className="input w-full xl:max-w-sm"
                  title="Upload prescription or discharge report"
                  aria-label="Upload prescription or discharge report"
                />
                <div className="flex flex-wrap items-center gap-2">
                  {prescriptionOrDischargeReportDataUrl ? (
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-2">
                      <a href={prescriptionOrDischargeReportDataUrl} target="_blank" rel="noreferrer" className="btn-secondary-sm">Open Existing</a>
                    </div>
                  ) : null}
                  {(prescriptionOrDischargeReportDataUrl || prescriptionOrDischargeReportFile) ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-2">
                      <button type="button" onClick={() => { setPrescriptionReportTouched(true); setPrescriptionOrDischargeReportDataUrl(''); setPrescriptionOrDischargeReportFile(null); }} className="btn-danger-sm">Remove</button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">Surgical Info / Report</label>
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-start">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleReportFileChange(e, setSurgicalReportTouched, setSurgicalInfoReportFile, 'Uploaded surgical info report')}
                  className="input w-full xl:max-w-sm"
                  title="Upload surgical info report"
                  aria-label="Upload surgical info report"
                />
                <div className="flex flex-wrap items-center gap-2">
                  {surgicalInfoReportDataUrl ? (
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-2">
                      <a href={surgicalInfoReportDataUrl} target="_blank" rel="noreferrer" className="btn-secondary-sm">Open Existing</a>
                    </div>
                  ) : null}
                  {(surgicalInfoReportDataUrl || surgicalInfoReportFile) ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-2">
                      <button type="button" onClick={() => { setSurgicalReportTouched(true); setSurgicalInfoReportDataUrl(''); setSurgicalInfoReportFile(null); }} className="btn-danger-sm">Remove</button>
                    </div>
                  ) : null}
                </div>
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
