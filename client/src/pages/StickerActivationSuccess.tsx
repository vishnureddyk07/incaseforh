import { useLocation, Link } from 'react-router-dom';

type SuccessState = {
  riderName?: string;
  bloodType?: string;
  serialNumber?: string;
  profileUrl?: string;
  qrActivationUrl?: string;
};

export default function StickerActivationSuccess() {
  const location = useLocation();
  const state = (location.state || {}) as SuccessState;

  const downloadQrPng = async () => {
    const data = state.profileUrl || state.qrActivationUrl || window.location.origin;
    const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(data)}`;
    const response = await fetch(qrApi);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${state.serialNumber || 'incase-qr'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-orange-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 text-4xl leading-[64px]">🎉</div>
        <h1 className="text-3xl font-bold text-gray-900">You are now protected by INcase</h1>
        <p className="mt-2 text-gray-600">Your emergency sticker is active and ready for critical situations.</p>

        <div className="mt-6 grid gap-3 rounded-xl bg-orange-50 p-4 text-left md:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-orange-700">Rider</p>
            <p className="font-semibold text-gray-900">{state.riderName || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-orange-700">Blood Type</p>
            <p className="font-semibold text-gray-900">{state.bloodType || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-orange-700">Serial</p>
            <p className="font-semibold text-gray-900">{state.serialNumber || '—'}</p>
          </div>
        </div>

        <p className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          Stick your QR on your helmet - it could save your life.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {state.profileUrl ? (
            <a href={state.profileUrl} className="rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700">
              View your emergency profile
            </a>
          ) : null}
          <button onClick={downloadQrPng} className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50">
            Download Emergency QR as PNG
          </button>
          <Link to="/" className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
