import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface SosAlert {
  _id: string;
  victimName?: string;
  victimPhone?: string;
  responderLocation?: { lat?: number; lng?: number };
  responderUserAgent?: string;
  triggeredAt?: string;
  status?: 'active' | 'cancelled' | 'resolved';
}

const getStatusBadgeClass = (status: SosAlert['status']) => {
  if (status === 'resolved') return 'bg-green-100 text-green-700 border-green-200';
  if (status === 'cancelled') return 'bg-neutral-100 text-neutral-700 border-neutral-200';
  return 'bg-red-100 text-red-700 border-red-200';
};

export default function SosPolice() {
  const location = useLocation();
  const [alert, setAlert] = useState<SosAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiBase = import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com';

  const alertId = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return query.get('alertId') || '';
  }, [location.search]);

  const mapsLink = useMemo(() => {
    const lat = alert?.responderLocation?.lat;
    const lng = alert?.responderLocation?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') return '';
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }, [alert]);

  useEffect(() => {
    const fetchAlert = async () => {
      if (!alertId) {
        setError('Missing alertId in URL');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${apiBase}/api/v1/sos/${encodeURIComponent(alertId)}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to fetch SOS alert');
        }
        const data = await res.json();
        setAlert(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch SOS alert';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchAlert();
  }, [alertId, apiBase]);

  return (
    <div className="min-h-screen gradient-primary px-4 py-8">
      <div className="mx-auto max-w-4xl card-elevated p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">Law Enforcement Portal</p>
            <h1 className="mt-1 text-2xl font-bold text-neutral-900 md:text-3xl">SOS Incident Alert</h1>
          </div>
          <Link to="/" className="btn-secondary-sm">
            Back to Home
          </Link>
        </div>

        {loading && <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">Loading SOS alert...</p>}

        {error && !loading && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
        )}

        {alert && !loading && !error && (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Alert ID</p>
                <p className="mt-1 break-all font-mono text-sm text-neutral-900">{alert._id}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Triggered Time</p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">
                  {alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleString() : 'Not available'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <h2 className="text-lg font-bold text-red-800">Victim Information</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <p className="text-sm text-red-900"><span className="font-semibold">Name:</span> {alert.victimName || 'Not available'}</p>
                <p className="text-sm text-red-900"><span className="font-semibold">Phone:</span> {alert.victimPhone || 'Not available'}</p>
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <h2 className="text-lg font-bold text-blue-800">Responder Location</h2>
              <p className="mt-3 text-sm text-blue-900">
                <span className="font-semibold">Coordinates:</span>{' '}
                {typeof alert.responderLocation?.lat === 'number' && typeof alert.responderLocation?.lng === 'number'
                  ? `${alert.responderLocation.lat}, ${alert.responderLocation.lng}`
                  : 'Not available'}
              </p>
              {mapsLink && (
                <a
                  href={mapsLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Open in Google Maps
                </a>
              )}
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <h2 className="text-lg font-bold text-neutral-900">Responder Device</h2>
              <p className="mt-2 break-words text-sm text-neutral-700">{alert.responderUserAgent || 'Not available'}</p>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <h2 className="text-lg font-bold text-neutral-900">Status</h2>
              <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase ${getStatusBadgeClass(alert.status)}`}>
                {alert.status || 'active'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
