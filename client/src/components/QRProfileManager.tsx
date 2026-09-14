import React, { useState, useEffect } from 'react';

interface Profile {
  _id: string;
  fullName: string;
  phoneNumber: string;
  bloodType?: string;
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
  onOpenAddModal: () => void;
}

export const QRProfileManager: React.FC<QRProfileManagerProps> = ({ uuid, onOpenAddModal }) => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSlots = async () => {
    try {
      if (!uuid) return;
      const res = await fetch(`/api/v1/qr/resolve/${uuid}`);
      const data = await res.json();
      if (res.ok && data.slots && data.slots.length > 0) {
        setSlots(data.slots);
      } else {
        // Fallback: Ensure Slot 2 with "+ Add User" always appears
        setSlots([
          { slotNumber: 1, type: 'PRIMARY', isOwner: true, occupied: true, profile: data?.profile || null, isActive: true },
          { slotNumber: 2, type: 'SECONDARY', isOwner: false, occupied: false, profile: null, isActive: false }
        ]);
      }
    } catch (err) {
      console.error('Failed to load profile slots', err);
      setSlots([
        { slotNumber: 1, type: 'PRIMARY', isOwner: true, occupied: true, profile: null, isActive: true },
        { slotNumber: 2, type: 'SECONDARY', isOwner: false, occupied: false, profile: null, isActive: false }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [uuid]);

  const handleSwitchActive = async (profileId: string) => {
    try {
      const res = await fetch(`/api/v1/qr/${uuid}/switch-active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });
      if (res.ok) {
        await fetchSlots();
      }
    } catch (err) {
      console.error('Error switching active profile', err);
    }
  };

  const handleRemoveSecondary = async (profileId: string) => {
    if (!window.confirm('Are you sure you want to remove this secondary user?')) return;
    try {
      const res = await fetch(`/api/v1/qr/${uuid}/secondary/${profileId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchSlots();
      }
    } catch (err) {
      console.error('Error removing profile', err);
    }
  };

  if (loading) return <div className="text-center py-4 text-gray-500">Loading QR profiles...</div>;

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
                    <p className="font-semibold text-gray-900">{slot.profile.fullName}</p>
                    <p className="text-xs text-gray-500">
                     {slot.profile.phoneNumber}
{slot.profile.bloodType && (
  <> {slot.profile.bloodType}</>
)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic mt-1">No user assigned (Slot free)</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
              {slot.occupied && slot.profile ? (
                <>
                  {slot.isActive && (
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
                  onClick={() => onOpenAddModal()}
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
    </div>
  );
};

export default QRProfileManager;