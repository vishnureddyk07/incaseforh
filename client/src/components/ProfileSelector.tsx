import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ChevronRight, Loader2, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import AddSecondaryUserModal from './AddSecondaryUserModal';

interface Profile {
  profileId: string;
  profileType?: 'PRIMARY' | 'SECONDARY';
  profileName: string;
  profileEmail?: string;
  profilePhone?: string;
}

interface QRData {
  uuid: string;
  multiProfileMode: boolean;
  profileCount: number;
  profiles: Profile[];
  activeProfileId?: string | null;
  status: string;
  type?: 'b2c' | 'b2b' | 'b2g';
}

export default function ProfileSelector() {
  const { uuid = '' } = useParams();
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com';
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [showAddProfile, setShowAddProfile] = useState(false);

  const loadProfiles = useCallback(async () => {
    if (!uuid) return;
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/api/v1/qr/${encodeURIComponent(uuid)}/profiles`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load profiles from QR');
      setQrData(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, [apiBase, uuid]);

  useEffect(() => { void loadProfiles(); }, [loadProfiles]);

  const selectProfile = async (profile: Profile) => {
    setSwitching(profile.profileId);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/v1/qr/${encodeURIComponent(uuid)}/switch-active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.profileId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to switch profile');
      sessionStorage.setItem('activeQrUuid', uuid);
      const identifier = data.activeProfile?.email || data.activeProfile?.phoneNumber || profile.profileEmail || profile.profilePhone || profile.profileId;
      navigate(`/emergencyinfo/${encodeURIComponent(identifier)}?qrUuid=${encodeURIComponent(uuid)}`, { replace: true });
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : 'Failed to switch profile');
    } finally {
      setSwitching(null);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;
  if (error || !qrData) return <div className="min-h-screen flex items-center justify-center p-6 text-red-600"><AlertCircle className="mr-2" />{error || 'QR profile data unavailable'}</div>;
  if (qrData.status !== 'active') return <div className="min-h-screen flex items-center justify-center p-6 text-amber-700">This QR does not have an active profile.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-t-lg shadow-lg p-6 border-b-2 border-blue-100">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Select Profile</h1>
          <p className="text-gray-600 text-sm">This QR code contains {qrData.profileCount} profile{qrData.profileCount === 1 ? '' : 's'}.</p>
        </div>
        <div className="bg-white shadow-lg px-4 py-2">
          {qrData.profiles.map((profile, index) => (
            <button key={profile.profileId} type="button" onClick={() => void selectProfile(profile)} disabled={Boolean(switching)} className={`w-full border-b p-4 text-left transition-colors ${profile.profileId === qrData.activeProfileId ? 'bg-emerald-50' : 'hover:bg-blue-50'}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-800">{profile.profileName || `Profile ${index + 1}`}</p>
                  <p className="text-xs font-medium text-slate-500">{profile.profileType === 'PRIMARY' || index === 0 ? 'Primary Profile' : 'Secondary Profile'}{profile.profileId === qrData.activeProfileId ? ' - Active' : ''}</p>
                  {profile.profileEmail ? <p className="text-sm text-gray-500">{profile.profileEmail}</p> : null}
                </div>
                {switching === profile.profileId ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
              </div>
            </button>
          ))}
          {qrData.profileCount < 3 ? (
            <button type="button" onClick={() => setShowAddProfile(true)} className="w-full text-left p-4 border-t border-dashed border-blue-300 hover:bg-blue-50 flex items-center gap-3 text-blue-600 font-semibold"><Plus className="h-5 w-5" />Add Profile ({qrData.profileCount}/3)</button>
          ) : null}
        </div>
      </div>
      <AddSecondaryUserModal uuid={uuid} isOpen={showAddProfile} onClose={() => setShowAddProfile(false)} onSuccess={() => { setShowAddProfile(false); void loadProfiles(); }} />
    </div>
  );
}
