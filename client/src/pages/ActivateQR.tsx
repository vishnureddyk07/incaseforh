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
    activatedBy?: {
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
  };
};

const normalizePhoneForComparison = (value: string) => value.replace(/\D/g, '');

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
  const [bloodTypeReport, setBloodTypeReport] = useState<File | null>(null);
  const [prescriptionOrDischargeReport, setPrescriptionOrDischargeReport] = useState<File | null>(null);
  const [surgicalInfoReport, setSurgicalInfoReport] = useState<File | null>(null);
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

  useEffect(() => {
    if (check?.status === 'active' && check.sticker?.activatedBy) {
      const existing = check.sticker.activatedBy;
      setFullName(existing.fullName || '');
      setPhoneNumber(existing.phoneNumber || '');
      setDateOfBirth(existing.dateOfBirth || '');
      setBloodType(existing.bloodType || '');
      setAllergies(existing.allergies || '');
      setMedications(existing.medications || '');
      setMedicalConditions(existing.medicalConditions || '');
      setEmail(existing.email || '');
      setAddress(existing.address || '');

      const existingContacts = Array.isArray(existing.emergencyContacts)
        ? existing.emergencyContacts
            .filter((c) => (c?.name || '').trim() || (c?.phone || '').trim())
            .map((c) => ({ name: c.name || '', phone: c.phone || '' }))
        : [];

      setContacts(existingContacts.length > 0 ? existingContacts : [{ name: '', phone: '' }]);
    }
  }, [check]);

  const updateContact = (idx: number, key: keyof EmergencyContact, value: string) => {
    setContacts((prev) => prev.map((c, i) => (i === idx ? { ...c, [key]: value } : c)));
  };

  const addContact = () => {
    setContacts((prev) => (prev.length >= 3 ? prev : [...prev, { name: '', phone: '' }]));
  };

  const removeContact = (idx: number) => {
    setContacts((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  };

  const submitActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!fullName.trim()) {
        throw new Error('Full Name is required.');
      }
      if (!phoneNumber.trim()) {
        throw new Error('Phone Number is required.');
      }
      if (!bloodType) {
        throw new Error('Blood Group is required.');
      }

      const validContacts = contacts.filter((c) => c.name.trim() && c.phone.trim());
      if (validContacts.length === 0) {
        throw new Error('Please add at least one emergency contact with name and phone number.');
      }

      const normalizedContactPhones = validContacts
        .map((contact) => normalizePhoneForComparison(contact.phone))
        .filter(Boolean);
      const hasDuplicateEmergencyContactNumber = new Set(normalizedContactPhones).size !== normalizedContactPhones.length;
      if (hasDuplicateEmergencyContactNumber) {
        throw new Error('Emergency contact numbers must be unique.');
      }

      const normalizedPrimaryPhone = normalizePhoneForComparison(phoneNumber);
      if (normalizedPrimaryPhone) {
        const hasSameAsPrimaryPhone = validContacts.some(
          (contact) => normalizePhoneForComparison(contact.phone) === normalizedPrimaryPhone
        );
        if (hasSameAsPrimaryPhone) {
          throw new Error('Your phone number and emergency contact number cannot be the same.');
        }
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
      if (bloodTypeReport) formData.append('bloodTypeReport', bloodTypeReport);
      if (prescriptionOrDischargeReport) formData.append('prescriptionOrDischargeReport', prescriptionOrDischargeReport);
      if (surgicalInfoReport) formData.append('surgicalInfoReport', surgicalInfoReport);

      const res = await fetch(`${apiBase}/api/v1/qr/activate/${encodeURIComponent(uuid)}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Activation failed');
      }

      if (check?.status === 'active' && data?.profileUrl) {
        window.location.assign(data.profileUrl);
        return;
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
    return <div className="min-h-screen grid place-items-center text-neutral-600">Loading sticker...</div>;
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
          <p className="mt-3 text-sm text-red-700">
            Admin can make this same sticker usable again from Admin Dashboard - QR Sticker Management - All Stickers - Reactivate.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 section">
      <div className="container-md">
        {check.status === 'active' ? (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-700">This sticker is already active.</p>
            <p className="text-xs text-green-700 mt-1">You can update the profile details below anytime. Changes are saved for this same sticker.</p>
          </div>
        ) : null}
        <div className="mb-6 rounded-xl border border-primary-200 bg-primary-50 p-4">
          <p className="text-sm font-semibold text-primary-700">Activating Sticker</p>
          <p className="text-xl font-bold text-primary-900">{check.sticker?.serialNumber}</p>
          <p className="text-xs text-primary-700">Fill your emergency details to protect yourself.</p>
        </div>

        <form onSubmit={submitActivation} className="space-y-5 card-elevated p-6">
          <h1 className="text-2xl font-bold text-neutral-900">Activate Your INcase Sticker</h1>
          <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
            <p className="text-sm font-semibold text-primary-800">Required vs Optional Fields</p>
            <p className="mt-1 text-xs text-primary-700">
              <strong>Required:</strong> Full Name, Phone Number, Blood Group, at least one emergency contact.<br/>
              <strong>Optional:</strong> Everything else (reports, additional info). Upload fields accept images or PDF reports.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 p-4">
            <p className="text-sm font-semibold text-neutral-800">Basic Information</p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="label label-required">Full Name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="input" required />
              </div>
              <div>
                <label className="label label-required">Phone Number</label>
                <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone Number" className="input" required />
              </div>
              <div>
                <label className="label">Date of Birth</label>
                <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="input" title="Date of birth" aria-label="Date of birth" />
              </div>
              <div>
                <label className="label label-required">Blood Group</label>
                <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} className="input" title="Blood type" aria-label="Blood type" required>
                  <option value="">Select Blood Type</option>
                  <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                  <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label">Blood Group Report (Optional)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setBloodTypeReport(e.target.files?.[0] || null)}
                  className="input"
                  title="Upload blood group report"
                  aria-label="Upload blood group report"
                />
                <p className="mt-1 text-xs text-neutral-500">Optional: add blood test report or lab card image for verification.</p>
              </div>
              <div>
                <label className="label">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className="input" />
              </div>
              <div>
                <label className="label">Address</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (optional)" className="input" />
              </div>
            </div>
          </div>

          <div className="relative rounded-2xl border-2 border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-200 rounded-full opacity-20 -mr-12 -mt-12"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-200 rounded-full opacity-20 -ml-16 -mb-16"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">👥</span>
                <div>
                  <p className="text-lg font-bold text-green-900">Emergency Contacts</p>
                  <p className="text-sm text-green-700">Required • At least 1 contact needed</p>
                </div>
              </div>
              <p className="text-sm text-green-700 mb-4 font-medium">These people will be notified immediately in case of emergency. They should be people who can reach you quickly and make decisions on your behalf.</p>
              <div className="space-y-3">
                {contacts.map((c, idx) => (
                  <div key={idx} className="flex items-end gap-2 bg-white rounded-lg p-3 border border-green-200">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-neutral-700">Name</label>
                      <input value={c.name} onChange={(e) => updateContact(idx, 'name', e.target.value)} placeholder="Contact name" className="input text-sm" required />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-neutral-700">Phone</label>
                      <input value={c.phone} onChange={(e) => updateContact(idx, 'phone', e.target.value)} placeholder="Phone number" className="input text-sm" required />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeContact(idx)}
                      disabled={contacts.length <= 1}
                      className="btn-danger-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title={contacts.length <= 1 ? 'At least one contact is required' : 'Remove contact'}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addContact} className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors">+ Add Emergency Contact</button>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 p-4">
            <p className="text-sm font-semibold text-neutral-800">Medical History</p>
            <p className="mt-1 text-xs text-neutral-500">Everything in this section is optional, but useful during emergencies.</p>
            <div className="mt-4 space-y-4">
              <textarea value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Allergies (optional)" className="input" />
              <textarea value={medications} onChange={(e) => setMedications(e.target.value)} placeholder="Medications (optional)" className="input" />
              <textarea value={medicalConditions} onChange={(e) => setMedicalConditions(e.target.value)} placeholder="Medical Conditions (optional)" className="input" />
              <div>
                <label className="label">Discharge Summary / Prescription</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setPrescriptionOrDischargeReport(e.target.files?.[0] || null)}
                  className="input"
                  title="Upload prescription or discharge report"
                  aria-label="Upload prescription or discharge report"
                />
                <p className="mt-1 text-xs text-neutral-500">Optional: include recent discharge summaries or prescriptions for faster treatment decisions.</p>
              </div>
              <div>
                <label className="label">Medical Reports</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setSurgicalInfoReport(e.target.files?.[0] || null)}
                  className="input"
                  title="Upload surgical information report"
                  aria-label="Upload surgical information report"
                />
                <p className="mt-1 text-xs text-neutral-500">Optional: upload additional medical reports like scans, specialist notes, or surgery reports.</p>
              </div>
            </div>
          </div>



          <div className="rounded-xl border border-neutral-200 p-4">
            <label className="mb-1 block text-sm font-medium text-neutral-700">Photo Upload (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} className="input" title="Upload profile photo" aria-label="Upload profile photo" />
            <p className="mt-1 text-xs text-neutral-500">Optional profile photo to help identify you quickly.</p>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button disabled={submitting} type="submit" className="btn-primary-lg w-full disabled:opacity-60">
            {submitting ? (check.status === 'active' ? 'Updating...' : 'Activating...') : (check.status === 'active' ? 'Update Profile' : 'Activate Sticker')}
          </button>

          <p className="text-center text-sm text-neutral-500">
            By activating, your emergency profile becomes available to first responders.
          </p>
          <div className="text-center">
            <Link to="/" className="text-sm text-primary-600 hover:underline">Back to Home</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
