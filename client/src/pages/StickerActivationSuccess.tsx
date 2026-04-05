import { useLocation, Link } from 'react-router-dom';

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

        <p className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          Stick your QR on your helmet - it could save your life.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
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
