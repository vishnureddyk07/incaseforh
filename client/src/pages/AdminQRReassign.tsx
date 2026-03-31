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

      const payload = {
        fullName,
        email,
        phoneNumber,
        dateOfBirth,
        bloodType,
        allergies,
        medications,
        medicalConditions,
        address,
        emergencyContacts,
      };

      const res = await fetch(`${backendApiBaseUrl}/api/v1/admin/qr/reassign/${encodeURIComponent(uuid)}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify(payload),
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
    return <div className="min-h-screen grid place-items-center text-gray-600">Loading profile...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reassign Sticker Profile</h1>
            <p className="text-sm text-gray-600">
              Serial: <span className="font-semibold">{sticker?.serialNumber || '—'}</span>
              {' '}| Status: <span className="font-semibold uppercase">{sticker?.status || '—'}</span>
              {' '}| UUID: <span className="font-mono text-xs">{sticker?.uuid || uuid}</span>
            </p>
            {profileId ? <p className="text-xs text-gray-500">Profile ID: {profileId}</p> : null}
          </div>
          <Link to="/admin/dashboard" className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
            Back to Dashboard
          </Link>
        </div>

        {error ? <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</p> : null}

        <form onSubmit={onSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="rounded-lg border px-3 py-2" />
            <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone Number" className="rounded-lg border px-3 py-2" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="rounded-lg border px-3 py-2" />
            <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="rounded-lg border px-3 py-2" />
            <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} className="rounded-lg border px-3 py-2">
              <option value="">Blood Type</option>
              <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
              <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
            </select>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className="rounded-lg border px-3 py-2" />
          </div>

          <textarea value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Allergies" className="w-full rounded-lg border px-3 py-2" rows={2} />
          <textarea value={medications} onChange={(e) => setMedications(e.target.value)} placeholder="Medications" className="w-full rounded-lg border px-3 py-2" rows={2} />
          <textarea value={medicalConditions} onChange={(e) => setMedicalConditions(e.target.value)} placeholder="Medical Conditions" className="w-full rounded-lg border px-3 py-2" rows={2} />

          <div className="space-y-2 rounded-xl border border-gray-200 p-4">
            <p className="font-semibold text-gray-700">Emergency Contacts</p>
            {contacts.map((c, idx) => (
              <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <input
                  value={c.name}
                  onChange={(e) => updateContact(idx, 'name', e.target.value)}
                  placeholder="Name"
                  className="rounded-lg border px-3 py-2"
                />
                <input
                  value={c.phone}
                  onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                  placeholder="Phone"
                  className="rounded-lg border px-3 py-2"
                />
                <button type="button" onClick={() => removeContact(idx)} className="rounded-lg border border-red-300 px-3 py-2 text-red-700 hover:bg-red-50">
                  Remove
                </button>
              </div>
            ))}
            <button type="button" onClick={addContact} className="rounded-lg border border-amber-300 px-3 py-2 text-amber-700 hover:bg-amber-50">
              + Add Contact
            </button>
          </div>

          <div className="flex gap-3">
            <button disabled={saving} type="submit" className="rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            <Link to="/admin/dashboard" className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
