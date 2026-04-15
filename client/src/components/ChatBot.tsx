import { useState } from 'react';
import { Send, MessageCircle, Phone, Lock, Edit, AlertCircle, CheckCircle } from 'lucide-react';

type EmergencyContact = { name: string; phone: string };

type ChatMessage = {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
};

type ChatbotState = 'welcome' | 'phone-input' | 'otp-sent' | 'otp-input' | 'profile-edit' | 'success' | 'error';

interface ProfileData {
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
}

export default function ChatBot() {
  const apiBase = import.meta.env.VITE_API_URL
    || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://incaseforh.onrender.com');

  const parseJsonSafe = async (response: Response) => {
    const responseText = await response.text();
    if (!responseText) return {};
    try {
      return JSON.parse(responseText);
    } catch {
      throw new Error('Server returned non-JSON response. Check API URL and ensure backend is running on port 5000.');
    }
  };
  
  // State management
  const [chatState, setChatState] = useState<ChatbotState>('welcome');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: '👋 Hello! I\'m your INcase assistant. I can help you update your emergency profile. Do you have a QR sticker linked to your phone number?',
      timestamp: new Date(),
    },
  ]);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedProfile, setEditedProfile] = useState<ProfileData>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [bloodTypeReportFile, setBloodTypeReportFile] = useState<File | null>(null);
  const [prescriptionReportFile, setPrescriptionReportFile] = useState<File | null>(null);
  const [surgicalReportFile, setSurgicalReportFile] = useState<File | null>(null);

  // Add message to chat
  const addMessage = (type: 'bot' | 'user', content: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  // Handle phone number submission
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      addMessage('user', `My phone number is ${phoneNumber}`);

      const response = await fetch(`${apiBase}/api/v1/chatbot/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await parseJsonSafe(response);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setChatState('otp-sent');
      const otpHint = data?.otp ? `\n\nTest OTP: ${data.otp}` : '';
      addMessage(
        'bot',
        `✅ OTP sent to ${phoneNumber}! 📱 Please check your phone for the 6-digit code and enter it below.${otpHint}`
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send OTP';
      setError(errorMsg);
      addMessage('bot', `❌ ${errorMsg}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP verification
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the OTP');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      addMessage('user', `OTP: ${otp}`);

      const response = await fetch(`${apiBase}/api/v1/chatbot/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otp }),
      });

      const data = await parseJsonSafe(response);

      if (!response.ok) {
        if (response.status === 429) {
          setChatState('error');
          addMessage('bot', `❌ Too many failed attempts. Please request a new OTP.`);
        } else {
          const attemptsLeft = data.attemptsLeft || 0;
          addMessage('bot', `❌ Incorrect OTP. You have ${attemptsLeft} attempt(s) left.`);
        }
        return;
      }

      // OTP verified successfully
      setAccessToken(data.accessToken);
      setChatState('profile-edit');
      addMessage('bot', `✅ Identity verified! Now you can update your emergency profile. Loading your current information...`);

      // Fetch profile data
      await fetchProfileData(data.accessToken);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to verify OTP';
      setError(errorMsg);
      addMessage('bot', `❌ ${errorMsg}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch profile data
  const fetchProfileData = async (token: string) => {
    try {
      const response = await fetch(`${apiBase}/api/v1/chatbot/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await parseJsonSafe(response);
      setEditedProfile(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch profile';
      setError(errorMsg);
      addMessage('bot', `❌ ${errorMsg}`);
    }
  };

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('fullName', editedProfile.fullName || '');
      formData.append('phoneNumber', editedProfile.phoneNumber || '');
      formData.append('email', editedProfile.email || '');
      formData.append('dateOfBirth', editedProfile.dateOfBirth || '');
      formData.append('bloodType', editedProfile.bloodType || '');
      formData.append('allergies', editedProfile.allergies || '');
      formData.append('medications', editedProfile.medications || '');
      formData.append('medicalConditions', editedProfile.medicalConditions || '');
      formData.append('address', editedProfile.address || '');

      if (photoFile) formData.append('photo', photoFile);
      if (bloodTypeReportFile) formData.append('bloodTypeReport', bloodTypeReportFile);
      if (prescriptionReportFile) formData.append('prescriptionOrDischargeReport', prescriptionReportFile);
      if (surgicalReportFile) formData.append('surgicalInfoReport', surgicalReportFile);

      if (editedProfile.emergencyContacts) {
        formData.append('emergencyContacts', JSON.stringify(editedProfile.emergencyContacts));
      }

      const response = await fetch(`${apiBase}/api/v1/chatbot/profile`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      const data = await parseJsonSafe(response);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setChatState('success');
      addMessage('bot', `✅ Your profile has been updated successfully! Your QR sticker is now linked with your latest emergency information.`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMsg);
      addMessage('bot', `❌ ${errorMsg}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Reset and start over
  const handleReset = () => {
    setChatState('welcome');
    setMessages([
      {
        id: '1',
        type: 'bot',
        content: '👋 Hello! I\'m your INcase assistant. I can help you update your emergency profile.',
        timestamp: new Date(),
      },
    ]);
    setPhoneNumber('');
    setOtp('');
    setAccessToken('');
    setError(null);
    setEditedProfile({});
    setPhotoFile(null);
    setBloodTypeReportFile(null);
    setPrescriptionReportFile(null);
    setSurgicalReportFile(null);
  };

  const handleAddContact = () => {
    const contacts = editedProfile.emergencyContacts || [];
    setEditedProfile({
      ...editedProfile,
      emergencyContacts: [...contacts, { name: '', phone: '' }],
    });
  };

  const handleRemoveContact = (index: number) => {
    const contacts = editedProfile.emergencyContacts || [];
    setEditedProfile({
      ...editedProfile,
      emergencyContacts: contacts.filter((_, i) => i !== index),
    });
  };

  const handleContactChange = (index: number, field: 'name' | 'phone', value: string) => {
    const contacts = editedProfile.emergencyContacts || [];
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setEditedProfile({
      ...editedProfile,
      emergencyContacts: updated,
    });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Chat area */}
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        {/* Chat header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 shadow-lg">
          <div className="flex items-center gap-2">
            <MessageCircle size={24} />
            <h1 className="text-xl font-bold">INcase Bot</h1>
          </div>
          <p className="text-sm text-orange-100">Your personal emergency profile assistant</p>
        </div>

        {/* Messages container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.type === 'user'
                    ? 'bg-orange-500 text-white rounded-br-none'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <span className="text-xs opacity-70 block mt-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="bg-white border-t border-gray-300 p-4">
          {error && (
            <div className="mb-3 p-3 bg-red-100 text-red-700 rounded flex items-center gap-2 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {chatState === 'welcome' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Ready to update your profile? Let's start with your phone number.
              </p>
              <button
                onClick={() => setChatState('phone-input')}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <Phone size={18} /> Update My Profile
              </button>
            </div>
          )}

          {chatState === 'phone-input' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-3">
              <input
                type="tel"
                placeholder="Enter your phone number (10 digits)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                maxLength={20}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <Send size={16} /> Send OTP {loading && '...'}
              </button>
            </form>
          )}

          {chatState === 'otp-sent' && (
            <form onSubmit={handleOtpSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center text-2xl tracking-widest"
                maxLength={6}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <Lock size={16} /> Verify OTP {loading && '...'}
              </button>
              <p className="text-xs text-gray-500 text-center">
                OTP valid for 5 minutes
              </p>
            </form>
          )}

          {chatState === 'profile-edit' && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              <p className="text-sm font-semibold text-gray-700 mb-3">Edit Your Information:</p>
              
              <input
                type="text"
                placeholder="Full Name"
                value={editedProfile.fullName || ''}
                onChange={(e) => setEditedProfile({ ...editedProfile, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />

              <input
                type="tel"
                placeholder="Phone Number"
                value={editedProfile.phoneNumber || ''}
                onChange={(e) => setEditedProfile({ ...editedProfile, phoneNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />

              <input
                type="email"
                placeholder="Email"
                value={editedProfile.email || ''}
                onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />

              <input
                type="date"
                placeholder="Date of Birth"
                value={editedProfile.dateOfBirth || ''}
                onChange={(e) => setEditedProfile({ ...editedProfile, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />

              <input
                type="text"
                placeholder="Blood Type (e.g., O+)"
                value={editedProfile.bloodType || ''}
                onChange={(e) => setEditedProfile({ ...editedProfile, bloodType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />

              <input
                type="text"
                placeholder="Allergies"
                value={editedProfile.allergies || ''}
                onChange={(e) => setEditedProfile({ ...editedProfile, allergies: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />

              <input
                type="text"
                placeholder="Medications"
                value={editedProfile.medications || ''}
                onChange={(e) => setEditedProfile({ ...editedProfile, medications: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />

              <textarea
                placeholder="Medical Conditions"
                value={editedProfile.medicalConditions || ''}
                onChange={(e) => setEditedProfile({ ...editedProfile, medicalConditions: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                rows={2}
              />

              <textarea
                placeholder="Address"
                value={editedProfile.address || ''}
                onChange={(e) => setEditedProfile({ ...editedProfile, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                rows={2}
              />

              <div className="border-t pt-3 mt-3">
                <p className="text-sm font-semibold text-gray-700 mb-2">Documents & Photo:</p>

                <label className="block text-xs text-gray-600 mb-1">Profile Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  aria-label="Profile Photo"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="w-full mb-2 text-sm"
                />

                <label className="block text-xs text-gray-600 mb-1">Blood Type Report</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  aria-label="Blood Type Report"
                  onChange={(e) => setBloodTypeReportFile(e.target.files?.[0] || null)}
                  className="w-full mb-2 text-sm"
                />

                <label className="block text-xs text-gray-600 mb-1">Prescription/Discharge Report</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  aria-label="Prescription or Discharge Report"
                  onChange={(e) => setPrescriptionReportFile(e.target.files?.[0] || null)}
                  className="w-full mb-2 text-sm"
                />

                <label className="block text-xs text-gray-600 mb-1">Surgical Info Report</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  aria-label="Surgical Info Report"
                  onChange={(e) => setSurgicalReportFile(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                />
              </div>

              <div className="border-t pt-3 mt-3">
                <p className="text-sm font-semibold text-gray-700 mb-2">Emergency Contacts:</p>
                {(editedProfile.emergencyContacts || []).map((contact, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={contact.name}
                      onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={contact.phone}
                      onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <button
                      onClick={() => handleRemoveContact(index)}
                      className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddContact}
                  className="text-xs text-orange-500 hover:text-orange-600 mt-2"
                >
                  + Add Contact
                </button>
              </div>

              <button
                onClick={handleProfileUpdate}
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 mt-4"
              >
                <Edit size={16} /> Save Changes {loading && '...'}
              </button>
            </div>
          )}

          {chatState === 'success' && (
            <div className="space-y-3">
              <div className="p-3 bg-green-100 text-green-700 rounded flex items-center gap-2">
                <CheckCircle size={20} />
                <span className="text-sm font-medium">Profile updated successfully!</span>
              </div>
              <button
                onClick={handleReset}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-medium"
              >
                Start Over
              </button>
            </div>
          )}

          {chatState === 'error' && (
            <button
              onClick={handleReset}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-medium"
            >
              Start Over
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
