import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { maskPhoneNumber } from '../utils/privacy';

interface SosContact {
  name?: string;
  phone?: string;
  relationship?: string;
}

interface SosAlert {
  _id: string;
  victimName?: string;
  victimPhone?: string;
  victimBloodType?: string;
  victimAllergies?: string;
  victimMedications?: string;
  victimEmergencyContacts?: SosContact[];
  responderLocation?: { lat?: number; lng?: number };
  triggeredAt?: string;
  status?: 'active' | 'cancelled' | 'resolved';
}

export default function SosAmbulance() {
  const location = useLocation();
  const [alert, setAlert] = useState<SosAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiBase = import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com';

  const alertId = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return query.get('alertId') || '';
  }, [location.search]);

  const navigationLink = useMemo(() => {
    const lat = alert?.responderLocation?.lat;
    const lng = alert?.responderLocation?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') return '';
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
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
      <div className="mx-auto max-w-5xl card-elevated p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-primary-200 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Ambulance Response Portal</p>
            <h1 className="mt-1 text-2xl font-bold text-primary-900 md:text-3xl">SOS Medical Alert</h1>
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
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Alert ID</p>
                <p className="mt-1 break-all font-mono text-xs text-primary-900">{alert._id}</p>
              </div>
              <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Triggered Time</p>
                <p className="mt-1 text-sm font-semibold text-primary-900">
                  {alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleString() : 'Not available'}
                </p>
              </div>
              <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Status</p>
                <span className="badge-primary mt-2 uppercase">
                  {alert.status || 'active'}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-primary-200 bg-primary-50 p-5">
              <h2 className="text-lg font-bold text-primary-900">Victim Medical Profile</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <p className="text-sm text-primary-900"><span className="font-semibold">Full Name:</span> {alert.victimName || 'Not available'}</p>
                <p className="text-sm text-primary-900"><span className="font-semibold">Phone:</span> {maskPhoneNumber(alert.victimPhone)}</p>
                <p className="text-sm text-primary-900"><span className="font-semibold">Blood Type:</span> {alert.victimBloodType || 'Not available'}</p>
                <p className="text-sm text-primary-900"><span className="font-semibold">Allergies:</span> {alert.victimAllergies || 'Not available'}</p>
                <p className="text-sm text-primary-900 md:col-span-2"><span className="font-semibold">Medications:</span> {alert.victimMedications || 'Not available'}</p>
              </div>
            </div>

            <div className="rounded-xl border border-primary-200 bg-white p-5">
              <h2 className="text-lg font-bold text-primary-900">Emergency Contacts</h2>
              {alert.victimEmergencyContacts && alert.victimEmergencyContacts.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {alert.victimEmergencyContacts.map((contact, index) => (
                    <div key={`${contact.phone || 'contact'}-${index}`} className="flex flex-col gap-2 rounded-lg border border-primary-100 bg-primary-50 p-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-primary-900">{contact.name || 'Contact'}</p>
                        <p className="text-xs text-primary-700">{contact.relationship || 'Relationship not specified'}</p>
                        <p className="text-xs text-primary-700">{maskPhoneNumber(contact.phone)}</p>
                      </div>
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="btn-primary-md"
                        >
                          Call
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-primary-700">No emergency contacts available.</p>
              )}
            </div>

            <div className="rounded-xl border border-primary-200 bg-white p-5">
              <h2 className="text-lg font-bold text-primary-900">Scene Location</h2>
              <p className="mt-2 text-sm text-primary-900">
                <span className="font-semibold">Coordinates:</span>{' '}
                {typeof alert.responderLocation?.lat === 'number' && typeof alert.responderLocation?.lng === 'number'
                  ? `${alert.responderLocation.lat}, ${alert.responderLocation.lng}`
                  : 'Not available'}
              </p>
              {navigationLink && (
                <a
                  href={navigationLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 btn-primary-md"
                >
                  Navigate with Google Maps
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
