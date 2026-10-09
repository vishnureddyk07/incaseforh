import React, { useState, useEffect } from 'react';

interface Profile {
  _id: string;
  profileId: string;
  profileName: string;
  fullName?: string;
  profilePhone?: string;
  phoneNumber?: string;
  profileType?: 'PRIMARY' | 'SECONDARY';
}

interface Slot {
  slotNumber: number;
  type: 'PRIMARY' | 'SECONDARY';
  isOwner: boolean;
  occupied: boolean;
  profile: Profile | null;
  isActive: boolean;
}

interface QRProfileManagerProps {
  uuid: string;
  onOpenAddModal: (slotNumber: number) => void;
  onProfileChanged?: (profile: Profile) => void;
  refreshToken?: number;
}

export const QRProfileManager: React.FC<QRProfileManagerProps> = ({ uuid, onOpenAddModal, onProfileChanged, refreshToken }) => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switchingProfile, setSwitchingProfile] = useState<Profile | null>(null);
  const [switchRequestId, setSwitchRequestId] = useState('');
  const [switchOtp, setSwitchOtp] = useState('');
  const [switchLoading, setSwitchLoading] = useState(false);
  const apiBase = (import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com').replace(/\/+$/, '');

  const fetchSlots = async () => {
    try {
      if (!uuid) return;
      setError(null);
      const res = await fetch(`${apiBase}/api/v1/qr/resolve/${encodeURIComponent(uuid)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load QR profiles');
      if (!Array.isArray(data.slots)) throw new Error('QR profile slots are unavailable');
      setSlots(data.slots);
    } catch (err) {
      console.error('Failed to load profile slots', err);
      setSlots([]);
      setError(err instanceof Error ? err.message : 'Failed to load QR profiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [uuid, refreshToken]);

  const handleSwitchActive = async (profileId: string) => {
    const profile = slots.flatMap((slot) => slot.profile ? [slot.profile] : []).find((entry) => entry._id === profileId);
    if (!profile || !profile.profilePhone && !profile.phoneNumber) {
      setError('This profile does not have a phone number for OTP verification.');
      return;
    }
    setSwitchingProfile(profile);
    setSwitchRequestId('');
    setSwitchOtp('');
    setError(null);
    try {
      setSwitchLoading(true);
      const response = await fetch(`${apiBase}/api/v1/chatbot/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: profile.profilePhone || profile.phoneNumber,
          qrUuid: uuid,
          profileId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send profile OTP');
      setSwitchRequestId(data.requestId || '');
    } catch (err) {
      setSwitchingProfile(null);
      setError(err instanceof Error ? err.message : 'Failed to send profile OTP');
    } finally {
      setSwitchLoading(false);
    }
  };

  const verifyProfileSwitch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!switchingProfile || !switchRequestId || !switchOtp.trim()) return;
    try {
      setSwitchLoading(true);
      const verifyResponse = await fetch(`${apiBase}/api/v1/chatbot/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: switchRequestId, otp: switchOtp.trim() }),
      });
      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(verifyData.error || 'Invalid profile OTP');

      const res = await fetch(`${apiBase}/api/v1/qr/${encodeURIComponent(uuid)}/switch-active`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${verifyData.accessToken}`,
        },
        body: JSON.stringify({ profileId: switchingProfile._id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.activeProfile) {
          onProfileChanged?.(data.activeProfile);
        }
        await fetchSlots();
        setSwitchingProfile(null);
        setSwitchRequestId('');
        setSwitchOtp('');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to switch active profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error switching active profile');
    } finally {
      setSwitchLoading(false);
    }
  };

  const handleRemoveSecondary = async (profileId: string) => {
    if (!window.confirm('Are you sure you want to remove this secondary user?')) return;
    try {
      const res = await fetch(`${apiBase}/api/v1/qr/${encodeURIComponent(uuid)}/secondary/${encodeURIComponent(profileId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchSlots();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to remove profile');
      }
    } catch (err) {
      console.error('Error removing profile', err);
    }
  };

  if (loading) return <div className="text-center py-4 text-gray-500">Loading QR profiles...</div>;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-xl mx-auto my-6">
      <h3 className="text-lg font-bold text-gray-900 mb-1">QR Profile Management</h3>
      <p className="text-sm text-gray-500 mb-6">
        Select who is currently using the vehicle so their details display if the QR is scanned.
      </p>

      <div className="space-y-4">
        {slots.map((slot) => (
          <div
            key={slot.slotNumber}
            className={`p-4 rounded-xl border transition-all ${
              slot.isActive
                ? 'border-emerald-500 bg-emerald-50/40'
                : 'border-gray-200 bg-gray-50/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Slot {slot.slotNumber}
                  </span>
                  {slot.isOwner && (
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                      Main Owner
                    </span>
                  )}
                  {slot.isActive && (
                    <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                      Currently Active
                    </span>
                  )}
                </div>

                {slot.occupied && slot.profile ? (
                  <div className="mt-1">
                    <p className="font-semibold text-gray-900">{slot.profile.profileName || slot.profile.fullName || 'Unnamed profile'}</p>
                    <p className="text-xs text-gray-500">
                     {slot.profile.profilePhone || slot.profile.phoneNumber || 'Phone not provided'}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic mt-1">No user assigned (Slot free)</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
              {slot.occupied && slot.profile ? (
                <>
                  {!slot.isActive && (
                    <button
                      onClick={() => handleSwitchActive(slot.profile!._id)}
                      className="text-xs bg-emerald-100 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full"
                    >
                      Set Active
                    </button>
                  )}
                  {!slot.isOwner && (
                    <button
                      onClick={() => handleRemoveSecondary(slot.profile!._id)}
                      className="text-xs text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 transition cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => onOpenAddModal(slot.slotNumber)}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm cursor-pointer"
                >
                  + Add User
                </button>
              )}
             </div>
          </div>
             </div>
        ))}
      </div>
      {switchingProfile && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <form onSubmit={verifyProfileSwitch} className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h4 className="text-lg font-bold text-gray-900">Verify profile switch</h4>
            <p className="mt-2 text-sm text-gray-600">
              Enter the OTP for {switchingProfile.profileName || switchingProfile.fullName || 'this profile'}.
            </p>
            <input
              value={switchOtp}
              onChange={(event) => setSwitchOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              className="mt-4 w-full rounded-lg border px-3 py-2 text-center text-xl tracking-widest"
              disabled={switchLoading || !switchRequestId}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setSwitchingProfile(null)} disabled={switchLoading} className="rounded border px-4 py-2">Cancel</button>
              <button type="submit" disabled={switchLoading || !switchRequestId || switchOtp.length !== 6} className="rounded bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
                {switchLoading ? 'Verifying...' : 'Switch Profile'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default QRProfileManager;
