import React, { useState } from 'react';

interface AddSecondaryUserModalProps {
  uuid: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddSecondaryUserModal: React.FC<AddSecondaryUserModalProps> = ({
  uuid,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    bloodType: 'O+',
    dateOfBirth: '',
    allergies: '',
    medications: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  const [registrationId, setRegistrationId] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        bloodType: formData.bloodType,
        dateOfBirth: formData.dateOfBirth,
        allergies: formData.allergies,
        medications: formData.medications,
        emergencyContacts: [
          { name: formData.emergencyContactName, phone: formData.emergencyContactPhone },
        ],
      };

      const res = await fetch(`/api/v1/qr/${uuid}/secondary/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request authorization');

      setRegistrationId(data.registrationId);
      setMaskedPhone(data.maskedPhone);
      setStep('otp');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/qr/${uuid}/secondary/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      alert('Profile successfully authorized and set as active!');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        {step === 'form' ? (
          <form onSubmit={handleFormSubmit}>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Add Temporary Rider Profile</h3>
            <p className="text-xs text-gray-500 mb-4">
              Enter emergency details. Authorization from the Main Owner is required.
            </p>

            {error && <div className="p-3 mb-4 bg-rose-50 text-rose-600 text-xs rounded-lg">{error}</div>}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">Full Name *</label>
                <input
                  required
                  type="text"
                  className="w-full text-sm border rounded-lg p-2 mt-1"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Phone Number *</label>
                  <input
                    required
                    type="tel"
                    className="w-full text-sm border rounded-lg p-2 mt-1"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Blood Group</label>
                  <select
                    className="w-full text-sm border rounded-lg p-2 mt-1"
                    value={formData.bloodType}
                    onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Emergency Contact Name *</label>
                <input
                  required
                  type="text"
                  className="w-full text-sm border rounded-lg p-2 mt-1"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Emergency Contact Phone *</label>
                <input
                  required
                  type="tel"
                  className="w-full text-sm border rounded-lg p-2 mt-1"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                type="submit"
                className="px-4 py-2 text-sm bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 cursor-pointer"
              >
                {loading ? 'Requesting...' : 'Continue to OTP'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Owner OTP Authorization</h3>
            <p className="text-xs text-gray-500 mb-4">
              A verification OTP has been sent to the Main Owner ({maskedPhone}). Enter the OTP to authorize this profile.
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-4">
              <strong>Testing Prototype Mode:</strong> Enter <strong>0708</strong> as the verification code.
            </div>

            {error && <div className="p-3 mb-4 bg-rose-50 text-rose-600 text-xs rounded-lg">{error}</div>}

            <div>
              <label className="text-xs font-semibold text-gray-700">Enter 4-digit OTP</label>
              <input
                required
                maxLength={4}
                type="text"
                placeholder="0708"
                className="w-full text-center text-2xl tracking-widest font-mono border rounded-lg p-2 mt-1"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Back
              </button>
              <button
                disabled={loading}
                type="submit"
                className="px-4 py-2 text-sm bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 cursor-pointer"
              >
                {loading ? 'Verifying...' : 'Authorize & Activate'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddSecondaryUserModal;