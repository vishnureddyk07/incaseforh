import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

type EmergencyContact = { name: string; phone: string };

type ActivationCheckResponse = {
  status: 'generated' | 'distributed' | 'unactivated' | 'active' | 'deactivated';
  reason?: string;
  redirectTo?: string;
  sticker?: {
    uuid: string;
    serialNumber: string;
    type: 'b2c' | 'b2b' | 'b2g';
    status: string;
  };
};

export default function ActivateQR() {
  const { uuid = '' } = useParams();
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com';

  const [check, setCheck] = useState<ActivationCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([{ name: '', phone: '' }]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBase}/api/v1/qr/activate/${encodeURIComponent(uuid)}?format=json`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || data.reason || 'Failed to load sticker');
        }
        if (active) setCheck(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load sticker');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [apiBase, uuid]);

  const updateContact = (idx: number, key: keyof EmergencyContact, value: string) => {
    setContacts((prev) => prev.map((c, i) => (i === idx ? { ...c, [key]: value } : c)));
  };

  const addContact = () => {
    setContacts((prev) => (prev.length >= 3 ? prev : [...prev, { name: '', phone: '' }]));
  };

  const removeContact = (idx: number) => {
    setContacts((prev) => prev.filter((_, i) => i !== idx));
  };

  const submitActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const validContacts = contacts.filter((c) => c.name.trim() && c.phone.trim());
      if (validContacts.length === 0) {
        throw new Error('Please add at least one emergency contact with name and phone number.');
      }

      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('phoneNumber', phoneNumber);
      formData.append('dateOfBirth', dateOfBirth);
      formData.append('bloodType', bloodType);
      formData.append('allergies', allergies);
      formData.append('medications', medications);
      formData.append('medicalConditions', medicalConditions);
      formData.append('email', email);
      formData.append('address', address);
      formData.append('emergencyContacts', JSON.stringify(validContacts));
      if (photo) formData.append('photo', photo);

      const res = await fetch(`${apiBase}/api/v1/qr/activate/${encodeURIComponent(uuid)}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Activation failed');
      }

      navigate('/activation-success', {
        state: {
          riderName: data?.emergencyInfo?.fullName || fullName,
          bloodType: data?.emergencyInfo?.bloodType || bloodType,
          serialNumber: data?.sticker?.serialNumber || check?.sticker?.serialNumber || '',
          profileUrl: data?.profileUrl,
          qrActivationUrl: `${window.location.origin}/activate/${uuid}`,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activation failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-gray-600">Loading sticker...</div>;
  }

  if (error) {
    return <div className="min-h-screen grid place-items-center text-red-600 font-semibold">{error}</div>;
  }

  if (!check) return null;

  if (check.status === 'deactivated') {
    return (
      <div className="min-h-screen bg-white px-4 py-10">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-2xl font-bold text-red-700">This sticker has been deactivated</h1>
          <p className="mt-3 text-red-600">Reason: {check.reason || 'No reason provided'}</p>
        </div>
      </div>
    );
  }

  if (check.status === 'active') {
    return (
      <div className="min-h-screen bg-white px-4 py-10">
        <div className="mx-auto max-w-xl rounded-2xl border border-orange-200 bg-orange-50 p-8 text-center">
          <h1 className="text-2xl font-bold text-orange-700">This QR is already registered</h1>
          <p className="mt-3 text-orange-700">Serial: {check.sticker?.serialNumber}</p>
          {check.redirectTo ? (
            <a href={check.redirectTo} className="mt-6 inline-block rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700">
              View Emergency Profile
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-semibold text-orange-700">Activating Sticker</p>
          <p className="text-xl font-bold text-orange-900">{check.sticker?.serialNumber}</p>
          <p className="text-xs text-orange-700">Fill your emergency details to protect yourself.</p>
        </div>

        <form onSubmit={submitActivation} className="space-y-4 rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Activate Your INcase Sticker</h1>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name (optional)" className="rounded-lg border px-3 py-2" />
            <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone Number (optional)" className="rounded-lg border px-3 py-2" />
            <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="rounded-lg border px-3 py-2" />
            <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} className="rounded-lg border px-3 py-2">
              <option value="">Blood Type (optional)</option>
              <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
              <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
            </select>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className="rounded-lg border px-3 py-2" />
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (optional)" className="rounded-lg border px-3 py-2" />
          </div>

          <textarea value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Allergies (optional)" className="w-full rounded-lg border px-3 py-2" />
          <textarea value={medications} onChange={(e) => setMedications(e.target.value)} placeholder="Medications (optional)" className="w-full rounded-lg border px-3 py-2" />
          <textarea value={medicalConditions} onChange={(e) => setMedicalConditions(e.target.value)} placeholder="Medical Conditions (optional)" className="w-full rounded-lg border px-3 py-2" />

          <div className="space-y-2">
            <p className="font-semibold text-gray-700">Emergency Contacts (at least 1 required)</p>
            {contacts.map((c, idx) => (
              <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <input value={c.name} onChange={(e) => updateContact(idx, 'name', e.target.value)} placeholder="Name" className="rounded-lg border px-3 py-2" />
                <input value={c.phone} onChange={(e) => updateContact(idx, 'phone', e.target.value)} placeholder="Phone" className="rounded-lg border px-3 py-2" />
                <button type="button" onClick={() => removeContact(idx)} className="rounded-lg border border-red-200 bg-red-50 text-red-600">Remove</button>
              </div>
            ))}
            <button type="button" onClick={addContact} className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-orange-700">+ Add Contact</button>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Photo Upload (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} className="w-full rounded-lg border px-3 py-2" />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button disabled={submitting} type="submit" className="w-full rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
            {submitting ? 'Activating...' : 'Activate Sticker'}
          </button>

          <p className="text-center text-sm text-gray-500">
            By activating, your emergency profile becomes available to first responders.
          </p>
          <div className="text-center">
            <Link to="/" className="text-sm text-orange-600 hover:underline">Back to Home</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
