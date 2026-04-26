import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, FileText, Heart, Phone, User, Shield, Upload, Users, Trash2 } from 'lucide-react';

type EmergencyContact = { name: string; phone: string };

type ActivationCheckResponse = {
  status: 'generated' | 'distributed' | 'unactivated' | 'active' | 'deactivated';
  reason?: string;
  redirectTo?: string;
  emergencyProfileUrl?: string;
  packSync?: {
    enabled: boolean;
    syncedCount: number;
    skippedCount: number;
  };
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
  const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
  const { uuid = '' } = useParams();
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com';

  const bloodTypeReportInputRef = useRef<HTMLInputElement | null>(null);
  const prescriptionReportInputRef = useRef<HTMLInputElement | null>(null);
  const medicalReportsInputRef = useRef<HTMLInputElement | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    if (check?.status !== 'active') return;
    const activeIdentifier = (
      check.sticker?.activatedBy?.email?.trim()
      || check.sticker?.activatedBy?.phoneNumber?.trim()
    );
    const localEmergencyProfileUrl = activeIdentifier
      ? `${window.location.origin}/emergencyinfo/${encodeURIComponent(activeIdentifier)}`
      : null;
    const safeRedirectTo = check.redirectTo && !/\/activate\//i.test(check.redirectTo)
      ? check.redirectTo
      : null;
    const destination = check.emergencyProfileUrl || localEmergencyProfileUrl || safeRedirectTo;
    if (!destination) return;
    window.location.replace(destination);
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

  const openFilePicker = (inputRef: React.RefObject<HTMLInputElement | null>) => {
    if (!inputRef.current) return;
    inputRef.current.value = '';
    inputRef.current.click();
  };

  const handleFileSelection = (
    event: React.ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void,
    label: string
  ) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setError(`${label} is too large. Maximum size is 10 MB.`);
      setFile(null);
      event.target.value = '';
      return;
    }

    setError(null);
    setFile(file);
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
            packSync: data?.packSync,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 section py-8">
      <div className="container-md">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="inline-block mb-4 p-3 bg-blue-100 rounded-full">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Emergency Protection Profile</h1>
          <p className="text-lg text-slate-600">Complete your safety information to enable instant emergency assistance</p>
        </div>

        {check.status === 'active' ? (
          <div className="mb-6 rounded-2xl border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-emerald-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-green-900">Profile Active</p>
                <p className="text-sm text-green-700 mt-1">Your profile is active. Update details anytime—changes save automatically.</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mb-8 rounded-2xl border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-blue-900">Sticker ID: {check.sticker?.serialNumber}</p>
              <p className="text-sm text-blue-700 mt-1">Activate your safety sticker and provide your emergency information</p>
            </div>
            <div className="text-3xl">📋</div>
          </div>
        </div>

        <form onSubmit={submitActivation} className="space-y-6">
          {/* Info Banner */}
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900">Field Requirements</p>
                <p className="text-sm text-amber-800 mt-2">
                  <strong>Required:</strong> Full Name, Phone Number, Blood Group, Emergency Contacts (min 1)<br/>
                  <strong>Optional:</strong> All other fields including medical reports and uploads
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information Card */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center gap-3">
              <User className="h-6 w-6 text-white" />
              <h2 className="text-xl font-bold text-white">Personal Information</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                    placeholder="Enter your full name" 
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                    placeholder="Enter your phone number" 
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Date of Birth</label>
                  <input 
                    type="date" 
                    value={dateOfBirth} 
                    onChange={(e) => setDateOfBirth(e.target.value)} 
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" 
                    title="Date of birth" 
                    aria-label="Date of birth" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">
                    Blood Group <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={bloodType} 
                    onChange={(e) => setBloodType(e.target.value)} 
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" 
                    title="Blood type" 
                    aria-label="Blood type" 
                    required
                  >
                    <option value="">Select Blood Type</option>
                    <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                    <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Blood Group Report
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-blue-50 transition">
                    <input
                      ref={bloodTypeReportInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileSelection(e, setBloodTypeReport, 'Blood group report')}
                      className="sr-only"
                      title="Upload blood group report"
                      aria-label="Upload blood group report"
                    />
                    <button
                      type="button"
                      onClick={() => openFilePicker(bloodTypeReportInputRef)}
                      className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Blood Group Report
                    </button>
                    <p className="text-xs text-slate-500 mt-2">PNG, JPG, PDF up to 10MB (Optional)</p>
                    {bloodTypeReport ? <p className="text-xs text-green-700 mt-2">Selected: {bloodTypeReport.name}</p> : null}
                  </div>
                  <p className="mt-2 text-xs text-slate-600">💡 Add your blood test report, lab card, or blood bank document for quick verification.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Email</label>
                  <input 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="your@email.com" 
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Address</label>
                  <input 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    placeholder="Your residential address" 
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contacts Card */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4 flex items-center gap-3">
              <Users className="h-6 w-6 text-white" />
              <div>
                <h2 className="text-xl font-bold text-white">Emergency Contacts</h2>
                <p className="text-emerald-100 text-sm">At least 1 contact required</p>
              </div>
            </div>
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-6 py-4 border-b border-slate-200">
              <div className="flex items-start gap-3">
                <Heart className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700">Your emergency contacts will be notified immediately in case of crisis. Choose people who can reach you quickly and make critical decisions on your behalf.</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {contacts.map((c, idx) => (
                <div key={idx} className="rounded-lg border-2 border-slate-200 p-4 hover:border-emerald-300 hover:bg-emerald-50 transition">
                  <div className="flex items-start gap-3 mb-3">
                    <Phone className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-1" />
                    <span className="text-xs font-bold text-slate-600 bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Contact {idx + 1}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-2">Name</label>
                      <input 
                        value={c.name} 
                        onChange={(e) => updateContact(idx, 'name', e.target.value)} 
                        placeholder="Full name" 
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-2">Phone Number</label>
                      <input 
                        value={c.phone} 
                        onChange={(e) => updateContact(idx, 'phone', e.target.value)} 
                        placeholder="Phone number" 
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm" 
                        required 
                      />
                    </div>
                  </div>
                  {contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContact(idx)}
                      disabled={contacts.length <= 1}
                      className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove contact"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove Contact
                    </button>
                  )}
                </div>
              ))}
              <button 
                type="button" 
                onClick={addContact} 
                disabled={contacts.length >= 3}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-bold py-3 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Users className="h-5 w-5" />
                Add Another Contact
              </button>
            </div>
          </div>

          {/* Medical Information Card */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4 flex items-center gap-3">
              <FileText className="h-6 w-6 text-white" />
              <div>
                <h2 className="text-xl font-bold text-white">Medical Information</h2>
                <p className="text-purple-100 text-sm">All fields are optional</p>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">Allergies</label>
                <textarea 
                  value={allergies} 
                  onChange={(e) => setAllergies(e.target.value)} 
                  placeholder="List any allergies to medications, food, etc." 
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none" 
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">Current Medications</label>
                <textarea 
                  value={medications} 
                  onChange={(e) => setMedications(e.target.value)} 
                  placeholder="List all medications you are currently taking" 
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none" 
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">Medical Conditions</label>
                <textarea 
                  value={medicalConditions} 
                  onChange={(e) => setMedicalConditions(e.target.value)} 
                  placeholder="Mention any chronic conditions, surgeries, or health concerns" 
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none" 
                  rows={2}
                />
              </div>
              
              {/* Medical Documents Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-600" />
                    Discharge/Prescription
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center hover:bg-purple-50 transition">
                    <input
                      ref={prescriptionReportInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileSelection(e, setPrescriptionOrDischargeReport, 'Prescription or discharge report')}
                      className="sr-only"
                      title="Upload prescription or discharge report"
                      aria-label="Upload prescription or discharge report"
                    />
                    <button
                      type="button"
                      onClick={() => openFilePicker(prescriptionReportInputRef)}
                      className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Document
                    </button>
                    <p className="text-xs text-slate-500 mt-2">PNG, JPG, PDF</p>
                    {prescriptionOrDischargeReport ? <p className="text-xs text-green-700 mt-2">Selected: {prescriptionOrDischargeReport.name}</p> : null}
                  </div>
                  <p className="mt-2 text-xs text-slate-600">📄 Recent medical reports for treatment continuity</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-600" />
                    Medical Reports
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center hover:bg-purple-50 transition">
                    <input
                      ref={medicalReportsInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileSelection(e, setSurgicalInfoReport, 'Medical report')}
                      className="sr-only"
                      title="Upload surgical information report"
                      aria-label="Upload surgical information report"
                    />
                    <button
                      type="button"
                      onClick={() => openFilePicker(medicalReportsInputRef)}
                      className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Document
                    </button>
                    <p className="text-xs text-slate-500 mt-2">PNG, JPG, PDF</p>
                    {surgicalInfoReport ? <p className="text-xs text-green-700 mt-2">Selected: {surgicalInfoReport.name}</p> : null}
                  </div>
                  <p className="mt-2 text-xs text-slate-600">🏥 Scans, specialist notes & surgery reports</p>
                </div>
              </div>
            </div>
          </div>



          {/* Profile Photo Card */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 flex items-center gap-3">
              <User className="h-6 w-6 text-white" />
              <h2 className="text-xl font-bold text-white">Profile Photo</h2>
            </div>
            <div className="p-6 text-center">
              <p className="text-sm text-slate-600 mb-4">Upload a clear photo to help responders identify you quickly</p>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-cyan-50 transition">
                <input
                  ref={profilePhotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelection(e, setPhoto, 'Profile photo')}
                  className="sr-only"
                  title="Upload profile photo"
                  aria-label="Upload profile photo"
                />
                <button
                  type="button"
                  onClick={() => openFilePicker(profilePhotoInputRef)}
                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-white px-4 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-50"
                >
                  <Upload className="h-4 w-4" />
                  Upload Profile Photo
                </button>
                <p className="text-xs text-slate-500 mt-2">PNG, JPG up to 10MB (Optional)</p>
                {photo ? <p className="text-xs text-green-700 mt-2">Selected: {photo.name}</p> : null}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error ? (
            <div className="rounded-2xl border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-rose-50 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            </div>
          ) : null}

          {/* Submit Button */}
          <button 
            disabled={submitting} 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-500 text-white font-bold py-3.5 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-60 text-lg flex items-center justify-center gap-2"
          >
            <Shield className="h-5 w-5" />
            {submitting ? (check.status === 'active' ? 'Updating Profile...' : 'Activating Sticker...') : (check.status === 'active' ? 'Update Profile' : 'Activate Sticker')}
          </button>

          <div className="text-center space-y-3">
            <p className="text-sm text-slate-600">
              ✓ By activating, your emergency profile becomes instantly available to first responders
            </p>
            <Link to="/" className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
              ← Back to Home
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
