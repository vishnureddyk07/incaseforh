import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ChevronRight, Loader2, Plus } from 'lucide-react';

interface Profile {
  _id: string;
  profileId: string;
  profileName: string;
  profileEmail?: string;
  addedAt?: string;
}

interface QRData {
  uuid: string;
  multiProfileMode: boolean;
  profileCount: number;
  profiles: Profile[];
  status: string;
  type?: 'b2c' | 'b2b' | 'b2g';
}

const readJsonResponse = async <T,>(res: Response): Promise<T> => {
  const raw = await res.text();
  if (!raw || !raw.trim()) {
    return {} as T;
  }

  const trimmed = raw.trim();
  if (trimmed.startsWith('<')) {
    throw new Error(`The server returned HTML instead of JSON. Check the backend URL or deployment. Status: ${res.status}.`);
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch (_error) {
    throw new Error(`The server returned an invalid JSON response. Status: ${res.status}.`);
  }
};

export default function ProfileSelector() {
  const { uuid = '' } = useParams();
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com';

  const [qrData, setQrData] = useState<QRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [showAddProfileForm, setShowAddProfileForm] = useState(false);
  const [addProfileName, setAddProfileName] = useState('');
  const [addProfileEmail, setAddProfileEmail] = useState('');
  const [addProfilePhone, setAddProfilePhone] = useState('');
  const [addProfileLoading, setAddProfileLoading] = useState(false);
  const [addProfileError, setAddProfileError] = useState<string | null>(null);

  // Fetch profile list from QR
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${apiBase}/api/v1/qr/${encodeURIComponent(uuid)}/profiles`);
        if (!res.ok) {
          throw new Error('Failed to load profiles from QR');
        }

        const data: QRData = await readJsonResponse<QRData>(res);
        setQrData(data);

        // If only one profile, auto-select it
        if (data.profiles.length === 1) {
          setSelectedProfile(data.profiles[0].profileId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profiles');
      } finally {
        setLoading(false);
      }
    };

    if (uuid) {
      fetchProfiles();
    }
  }, [uuid, apiBase]);

  // Handle profile selection and OTP flow
  const handleSelectProfile = (profileId: string) => {
    setSelectedProfile(profileId);
    setShowOTPModal(true);
    setOtpSent(false);
    setPhoneNumber('');
    setOtp('');
    setOtpError(null);
  };

  // Request OTP
  const handleRequestOTP = async () => {
    if (!phoneNumber.trim()) {
      setOtpError('Phone number is required');
      return;
    }

    try {
      setOtpLoading(true);
      setOtpError(null);

      const res = await fetch(`${apiBase}/api/v1/chatbot/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });

      if (!res.ok) {
        const error = await readJsonResponse<{ error?: string }>(res).catch(() => ({ error: 'Failed to send OTP' }));
        throw new Error(error.error || 'Failed to send OTP');
      }

      const data = await readJsonResponse<{ otp?: string }>(res);
      setOtpSent(true);
      setOtp('');
      setOtpError(null);
      console.log('OTP sent to:', phoneNumber);
      if (data.otp) {
        console.log('Development mode - OTP:', data.otp);
      }
    } catch (err) {
      setOtpSent(false);
      setOtpError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP and fetch profile
  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      setOtpError('OTP is required');
      return;
    }

    if (!selectedProfile) {
      setOtpError('No profile selected');
      return;
    }

    try {
      setOtpLoading(true);
      setOtpError(null);

      // Verify OTP with backend
      const verifyRes = await fetch(`${apiBase}/api/v1/chatbot/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber: phoneNumber.trim(), 
          otp: otp.trim() 
        }),
      });

      if (!verifyRes.ok) {
        const error = await readJsonResponse<{ error?: string }>(verifyRes).catch(() => ({ error: 'Invalid OTP' }));
        throw new Error(error.error || 'Invalid OTP');
      }

      const { accessToken } = await readJsonResponse<{ accessToken: string }>(verifyRes);

      // OTP verified! Now fetch the profile data with the token
      const profileRes = await fetch(
        `${apiBase}/api/v1/qr/${encodeURIComponent(uuid)}/profile/${encodeURIComponent(selectedProfile)}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!profileRes.ok) {
        const error = await readJsonResponse<{ error?: string }>(profileRes).catch(() => ({ error: 'Failed to fetch profile' }));
        throw new Error(error.error || 'Failed to fetch profile');
      }

      const profileData = await readJsonResponse<{ profile: { email?: string; phoneNumber?: string } }>(profileRes);

      // Profile loaded! Redirect to emergency info page
      // Store profile data temporarily in session storage for the emergency info page
      sessionStorage.setItem('multiProfileData', JSON.stringify(profileData.profile));
      
      // Navigate to emergency info page
      const identifier = profileData.profile.email || profileData.profile.phoneNumber;
      navigate(`/emergencyinfo/${encodeURIComponent(identifier)}`);
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Failed to verify OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  // Add a new profile to this multi-profile QR
  const handleAddProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddProfileError(null);

    if (!addProfileName.trim()) {
      setAddProfileError('Profile name is required');
      return;
    }

    if (!addProfilePhone.trim()) {
      setAddProfileError('Phone number is required');
      return;
    }

    try {
      setAddProfileLoading(true);

      // Activate a new profile on this QR (create emergency info)
      const formData = new FormData();
      formData.append('fullName', addProfileName.trim());
      formData.append('phoneNumber', addProfilePhone.trim());
      if (addProfileEmail.trim()) {
        formData.append('email', addProfileEmail.trim());
      }
      formData.append('emergencyContacts', JSON.stringify([
        { name: 'Emergency Contact', phone: addProfilePhone }
      ]));
      formData.append('bloodType', 'O+'); // Default
      formData.append('allergies', 'None');
      formData.append('medications', 'None');
      formData.append('medicalConditions', 'None');

      const activateRes = await fetch(`${apiBase}/api/v1/qr/activate/${encodeURIComponent(uuid)}`, {
        method: 'POST',
        body: formData,
      });

      if (!activateRes.ok) {
        const error = await readJsonResponse<{ error?: string }>(activateRes).catch(() => ({ error: 'Failed to add profile' }));
        if (error.error?.includes('maximum of 3 profiles')) {
          throw new Error('This shared QR already has the maximum of 3 profiles.');
        }
        throw new Error(error.error || 'Failed to add profile');
      }

      const response = await readJsonResponse<{ emergencyInfo?: { _id: string }; sticker?: { profileCount: number } }>(activateRes);
      
      // Success! Refresh the profile list
      setShowAddProfileForm(false);
      setAddProfileName('');
      setAddProfileEmail('');
      setAddProfilePhone('');
      
      // Reload profiles
      const reloadRes = await fetch(`${apiBase}/api/v1/qr/${encodeURIComponent(uuid)}/profiles`);
      if (reloadRes.ok) {
        const updatedData: QRData = await readJsonResponse<QRData>(reloadRes);
        setQrData(updatedData);
      }
    } catch (err) {
      setAddProfileError(err instanceof Error ? err.message : 'Failed to add profile');
    } finally {
      setAddProfileLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading profiles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center gap-2 text-red-600 mb-4">
            <AlertCircle className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Error</h1>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (
    !qrData ||
    !qrData.multiProfileMode ||
    (qrData.type !== 'b2c' && qrData.type !== 'b2b')
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center gap-2 text-amber-600 mb-4">
            <AlertCircle className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Invalid QR</h1>
          </div>
          <p className="text-gray-600 mb-6">
            This QR code is not eligible for multi-profile access. Multi-profile QR access is available for individual and business customers.
          </p>
          <button
            onClick={() => window.history.back()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-lg shadow-lg p-6 border-b-2 border-blue-100">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Select Profile</h1>
          <p className="text-gray-600 text-sm">
            This QR code contains {qrData.profileCount} profile{qrData.profileCount > 1 ? 's' : ''}
          </p>
        </div>

        {/* Profile List and Add Option */}
        <div className="bg-white shadow-lg px-4 py-2">
          {qrData.profiles.map((profile, index) => (
            <button
              key={profile.profileId}
              onClick={() => handleSelectProfile(profile.profileId)}
              className={`w-full text-left p-4 border-b flex items-center justify-between hover:bg-blue-50 transition-colors ${
                selectedProfile === profile.profileId ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{profile.profileName || `Profile ${index + 1}`}</p>
                {profile.profileEmail && (
                  <p className="text-sm text-gray-500">{profile.profileEmail}</p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          ))}

          {/* Add Profile Button */}
          {qrData.profileCount < 3 && !showAddProfileForm && (
            <button
              onClick={() => {
                setShowAddProfileForm(true);
                setAddProfileError(null);
              }}
              className="w-full text-left p-4 border-t border-dashed border-blue-300 hover:bg-blue-50 transition-colors flex items-center gap-3 text-blue-600 font-semibold"
            >
              <Plus className="h-5 w-5" />
              Add Profile ({qrData.profileCount}/3)
            </button>
          )}

          {/* Add Profile Form */}
          {showAddProfileForm && (
            <div className="p-4 border-t border-dashed border-blue-300 bg-blue-50">
              <h3 className="font-semibold text-gray-800 mb-4">Add New Profile</h3>
              <form onSubmit={handleAddProfile} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={addProfileName}
                    onChange={(e) => setAddProfileName(e.target.value)}
                    placeholder="e.g., John Doe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={addProfileLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={addProfilePhone}
                    onChange={(e) => setAddProfilePhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={addProfileLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={addProfileEmail}
                    onChange={(e) => setAddProfileEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={addProfileLoading}
                  />
                </div>

                {addProfileError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {addProfileError}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddProfileForm(false);
                      setAddProfileName('');
                      setAddProfileEmail('');
                      setAddProfilePhone('');
                      setAddProfileError(null);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                    disabled={addProfileLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    disabled={addProfileLoading || !addProfileName.trim() || !addProfilePhone.trim()}
                  >
                    {addProfileLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Add Profile
                  </button>
                </div>
              </form>
            </div>
          )}

          {qrData.profileCount >= 3 && (
            <div className="p-4 border-t border-dashed border-amber-300 bg-amber-50 text-amber-700 text-sm">
              Maximum 3 profiles reached
            </div>
          )}
        </div>

        {/* OTP Modal */}
        {showOTPModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Secure access</h2>
              <p className="text-gray-600 mb-5 text-sm">
                {otpSent
                  ? 'We sent a 6-digit code to this number. Enter it below to continue.'
                  : 'Choose a profile and verify your phone number to view the saved details.'}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={otpLoading}
                />
              </div>

              {otpSent && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter OTP (6 digits)
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
                    disabled={otpLoading}
                  />
                </div>
              )}

              {otpError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {otpError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowOTPModal(false);
                    setSelectedProfile(null);
                    setOtpSent(false);
                    setPhoneNumber('');
                    setOtp('');
                    setOtpError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={otpLoading}
                >
                  Cancel
                </button>

                {otpSent ? (
                  <button
                    onClick={handleVerifyOTP}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    disabled={otpLoading || otp.length !== 6}
                  >
                    {otpLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Verify
                  </button>
                ) : (
                  <button
                    onClick={handleRequestOTP}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    disabled={otpLoading || !phoneNumber.trim()}
                  >
                    {otpLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Send code
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="bg-blue-50 rounded-b-lg shadow-lg p-4 text-center text-xs text-gray-600">
          <p>Your information is secure and encrypted.</p>
        </div>
      </div>
    </div>
  );
}
