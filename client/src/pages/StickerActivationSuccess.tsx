import { useLocation, Link } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';

type SuccessState = {
  riderName?: string;
  bloodType?: string;
  serialNumber?: string;
  profileUrl?: string;
  qrActivationUrl?: string;
  packSync?: {
    enabled: boolean;
    syncedCount: number;
    skippedCount: number;
  };
  isMultiProfile?: boolean;
  qrUuid?: string;
  qrType?: 'b2c' | 'b2b' | 'b2g';
  profileCount?: number;
};

export default function StickerActivationSuccess() {
  const location = useLocation();
  const state = (location.state || {}) as SuccessState;

  return (
    <div className="min-h-screen gradient-primary px-4 py-10">
      <div className="mx-auto max-w-2xl card-elevated p-8 text-center">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 text-4xl leading-[64px]">🎉</div>
        <h1 className="text-3xl font-bold text-neutral-900">You are now protected by INcase</h1>
        <p className="mt-2 text-neutral-600">Your emergency sticker is active and ready for critical situations.</p>

        <div className="mt-6 grid gap-3 rounded-xl bg-primary-50 p-4 text-left md:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-primary-700">Rider</p>
            <p className="font-semibold text-neutral-900">{state.riderName || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-primary-700">Blood Type</p>
            <p className="font-semibold text-neutral-900">{state.bloodType || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-primary-700">Serial</p>
            <p className="font-semibold text-neutral-900">{state.serialNumber || '—'}</p>
          </div>
        </div>

        {state.packSync?.enabled ? (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-left text-sm text-green-800">
            <p className="font-semibold">2-Pack sync confirmed</p>
            <p className="mt-1">{state.packSync.syncedCount} sticker(s) were linked to the same profile. {state.packSync.skippedCount} sticker(s) were left unchanged.</p>
          </div>
        ) : null}

        {state.isMultiProfile && (state.qrType === 'b2c' || state.qrType === 'b2b') ? (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900">
            <p className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Shared QR Profile
            </p>
            <p className="mt-2">You can add up to 2 more family members or colleagues to this QR code. Each profile is protected by their own OTP.</p>
            {state.profileCount ? (
              <p className="mt-2 text-xs text-amber-700">
                <strong>Profiles: {state.profileCount}/3</strong>
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          Stick your QR on your helmet - it could save your life.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {state.isMultiProfile && state.qrUuid && (state.qrType === 'b2c' || state.qrType === 'b2b') ? (
            <>
              <Link 
                to={`/qr/profiles/${encodeURIComponent(state.qrUuid)}`}
                className="btn-primary-md flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Profile
              </Link>
              {state.profileCount && state.profileCount > 1 ? (
                <Link 
                  to={`/qr/profiles/${encodeURIComponent(state.qrUuid)}`}
                  className="btn-secondary-md flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Switch Profile
                </Link>
              ) : null}
            </>
          ) : null}
          {state.profileUrl ? (
            <a href={state.profileUrl} className="btn-primary-md">
              View your emergency profile
            </a>
          ) : null}
          <Link to="/" className="btn-secondary-md">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
