import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { maskPhoneNumber } from '../utils/privacy';

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

interface VictimProfile {
  _id?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  bloodType?: string;
  address?: string;
  allergies?: string;
  medications?: string;
  medicalConditions?: string;
  emergencyContacts?: EmergencyContact[];
  photo?: string;
  bloodTypeReport?: string;
  prescriptionOrDischargeReport?: string;
  surgicalInfoReport?: string;
}

interface SosAlert {
  _id: string;
  victimEmergencyInfoId?: string;
  victimPhone: string;
  victimName: string;
  victimBloodType?: string;
  victimAllergies?: string;
  victimMedications?: string;
  victimEmergencyContacts?: EmergencyContact[];
  victimProfile?: VictimProfile | null;
  responderDeviceId?: string;
  responderLocation?: { lat: number; lng: number };
  responderLocationAccuracy?: number | null;
  responderIP?: string;
  responderUserAgent?: string;
  triggeredAt: string;
  status: 'active' | 'resolved' | 'cancelled';
  closedByEmail?: string;
  resolvedAt?: string;
}

export default function AmbulanceDashboard() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [closingAlertId, setClosingAlertId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(true);

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/ambulance/login');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/sos?resolvedLimit=120`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          navigate('/ambulance/login');
          return;
        }
        throw new Error('Failed to fetch alerts');
      }

      const data = await response.json();
      setAlerts(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchAlerts();

    // Near real-time updates without manual refresh.
    let timerId: number;

    const scheduleRefresh = () => {
      const refreshDelay = document.visibilityState === 'visible' ? 2000 : 10000;
      timerId = window.setTimeout(async () => {
        await fetchAlerts();
        setLastRefresh(new Date());
        scheduleRefresh();
      }, refreshDelay);
    };

    const handleFocusRefresh = async () => {
      await fetchAlerts();
      setLastRefresh(new Date());
    };

    const handleVisibilityChange = () => {
      setIsLive(document.visibilityState === 'visible');
      if (document.visibilityState === 'visible') {
        handleFocusRefresh();
      }
    };

    scheduleRefresh();
    window.addEventListener('focus', handleFocusRefresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener('focus', handleFocusRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [navigate]);

  const activeAlerts = alerts.filter((a) => a.status === 'active');
  const pastAlerts = alerts.filter((a) => a.status !== 'active');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/ambulance/login');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isImageData = (value?: string) => Boolean(value && value.startsWith('data:image'));

  const hasReadableValue = (value?: string) => Boolean(value && value.trim());

  const getNavLink = (lat?: number, lng?: number) => {
    if (!lat || !lng) return '#';
    return `https://www.google.com/maps?api=1&destination=${lat},${lng}`;
  };

  const closeCase = async (alertId: string) => {
    try {
      setClosingAlertId(alertId);
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/ambulance/login');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/sos/${alertId}/close`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to close case');
      }

      await fetchAlerts();
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close case');
    } finally {
      setClosingAlertId(null);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🚑</div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Medical Control Room</h1>
              <p className="text-sm text-neutral-600">Emergency Response Dispatch</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p className="text-neutral-700">{user?.email}</p>
              <p className="text-xs text-neutral-500">Last refresh: {lastRefresh.toLocaleTimeString()}</p>
              <p className={`text-xs ${isLive ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isLive ? 'Live updates ON (2s)' : 'Background mode (10s)'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-danger text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-neutral-900">
            <span className="text-2xl">🚨</span>
            Active Medical Emergencies ({activeAlerts.length})
          </h2>

          {loading ? (
            <div className="p-8 card-elevated text-center border border-neutral-200">
              <p className="text-neutral-600">Loading emergencies...</p>
            </div>
          ) : activeAlerts.length === 0 ? (
            <div className="p-8 card-elevated text-center border border-neutral-200">
              <p className="text-neutral-600">No active emergencies at this time</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeAlerts.map((alert) => (
                <div key={alert._id} className="card-elevated border-2 border-primary-300">
                  <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-3 animate-pulse-soft">
                    <p className="text-white font-bold text-lg">🚨 ACTIVE EMERGENCY RESPONSE REQUIRED</p>
                  </div>

                  <div className="p-6 space-y-6">
                    {alert.victimProfile?.photo ? (
                      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-600">Patient Photo</p>
                        <img
                          src={alert.victimProfile.photo}
                          alt="Patient profile"
                          className="h-40 w-40 rounded-lg border border-neutral-200 object-cover"
                        />
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                        <p className="text-xs text-neutral-600 uppercase tracking-wide font-semibold mb-1">Patient Name</p>
                        <p className="text-2xl font-bold text-neutral-900">{alert.victimProfile?.fullName || alert.victimName || 'Unknown'}</p>
                      </div>
                      <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                        <p className="text-xs text-neutral-600 uppercase tracking-wide font-semibold mb-1">Emergency Call</p>
                        <a
                          href={`tel:${alert.victimProfile?.phoneNumber || alert.victimPhone}`}
                          className="text-2xl font-bold text-red-600 hover:text-red-700 underline break-all"
                        >
                          {maskPhoneNumber(alert.victimProfile?.phoneNumber || alert.victimPhone)}
                        </a>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg border border-red-300">
                        <p className="text-xs text-red-700 uppercase tracking-wide font-semibold mb-1">Blood Type</p>
                        <p className="text-2xl font-bold text-red-600">{alert.victimProfile?.bloodType || alert.victimBloodType || 'Unknown'}</p>
                      </div>
                      <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                        <p className="text-xs text-neutral-600 uppercase tracking-wide font-semibold mb-1">Alert ID</p>
                        <p className="text-sm font-mono text-neutral-700 break-all">{alert._id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                        <p className="text-xs text-neutral-600 uppercase tracking-wide font-semibold mb-1">Email</p>
                        <p className="text-sm text-neutral-900 break-all">{alert.victimProfile?.email || 'Not provided'}</p>
                      </div>
                      <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                        <p className="text-xs text-neutral-600 uppercase tracking-wide font-semibold mb-1">Date of Birth</p>
                        <p className="text-sm text-neutral-900">{alert.victimProfile?.dateOfBirth || 'Not provided'}</p>
                      </div>
                      <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 md:col-span-2">
                        <p className="text-xs text-neutral-600 uppercase tracking-wide font-semibold mb-1">Address</p>
                        <p className="text-sm text-neutral-900">{alert.victimProfile?.address || 'Not provided'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg border border-red-200 bg-red-50">
                        <h4 className="font-semibold text-red-900 mb-2">⚠️ Allergies</h4>
                        <p className="text-sm text-red-800">{alert.victimProfile?.allergies || alert.victimAllergies || 'No known allergies'}</p>
                      </div>
                      <div className="p-4 rounded-lg border border-primary-200 bg-primary-50">
                        <h4 className="font-semibold text-primary-900 mb-2">💊 Current Medications</h4>
                        <p className="text-sm text-primary-800">{alert.victimProfile?.medications || alert.victimMedications || 'No medications listed'}</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
                      <h4 className="font-semibold text-amber-900 mb-2">🩺 Medical Conditions</h4>
                      <p className="text-sm text-amber-800">{alert.victimProfile?.medicalConditions || 'No medical conditions listed'}</p>
                    </div>

                    {(hasReadableValue(alert.victimProfile?.bloodTypeReport) || hasReadableValue(alert.victimProfile?.prescriptionOrDischargeReport) || hasReadableValue(alert.victimProfile?.surgicalInfoReport)) && (
                      <div className="border-t border-neutral-200 pt-6">
                        <h4 className="mb-3 font-semibold text-neutral-900">📄 Medical Documents</h4>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          {[
                            { label: 'Blood Group Report', value: alert.victimProfile?.bloodTypeReport },
                            { label: 'Prescription / Discharge Report', value: alert.victimProfile?.prescriptionOrDischargeReport },
                            { label: 'Surgical Info Report', value: alert.victimProfile?.surgicalInfoReport },
                          ].map((doc) => (
                            <div key={doc.label} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                              <p className="mb-2 text-sm font-semibold text-neutral-800">{doc.label}</p>
                              {doc.value ? (
                                <div className="space-y-2">
                                  {isImageData(doc.value) ? (
                                    <img src={doc.value} alt={doc.label} className="h-28 w-full rounded-md border border-neutral-200 object-cover" />
                                  ) : null}
                                  <a
                                    href={doc.value}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-secondary-sm inline-block"
                                  >
                                    Open Existing
                                  </a>
                                </div>
                              ) : (
                                <p className="text-sm text-neutral-500">Not provided</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(alert.victimProfile?.emergencyContacts?.length || alert.victimEmergencyContacts?.length) ? (
                      <div className="border-t border-neutral-200 pt-6">
                        <h4 className="font-semibold text-neutral-900 mb-3">👥 Emergency Contacts</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(alert.victimProfile?.emergencyContacts || alert.victimEmergencyContacts || []).map((contact, idx) => (
                            <div key={idx} className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 hover:bg-neutral-100 transition-colors">
                              <p className="font-semibold text-neutral-900">{contact.name}</p>
                              <p className="text-sm text-neutral-600 mb-2">{contact.relationship || 'Contact'}</p>
                              <p className="text-sm text-neutral-600 mb-2">{maskPhoneNumber(contact.phone)}</p>
                              <a
                                href={`tel:${contact.phone}`}
                                className="btn-success text-sm"
                              >
                                📞 Call
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="border-t border-neutral-200 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-700 uppercase tracking-wide font-semibold mb-2">GPS Coordinates</p>
                        <p className="font-mono text-sm text-blue-900">
                          {alert.responderLocation
                            ? `${alert.responderLocation.lat.toFixed(6)}, ${alert.responderLocation.lng.toFixed(6)}`
                            : 'Location unavailable'}
                        </p>
                        <p className="mt-1 text-xs text-blue-700">
                          Accuracy:{' '}
                          {typeof alert.responderLocationAccuracy === 'number'
                            ? `±${Math.round(alert.responderLocationAccuracy)}m`
                            : 'Unknown'}
                        </p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <p className="text-xs text-green-700 uppercase tracking-wide font-semibold mb-2">Incident Time</p>
                        <p className="text-sm text-green-900">{formatTime(alert.triggeredAt)}</p>
                        <p className="mt-1 text-xs text-green-800">Device ID: {alert.responderDeviceId || 'Not available'}</p>
                      </div>
                    </div>

                    <a
                      href={getNavLink(alert.responderLocation?.lat, alert.responderLocation?.lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary-lg block w-full text-center"
                    >
                      🗺️ Open Navigation
                    </a>
                    <button
                      type="button"
                      onClick={() => closeCase(alert._id)}
                      disabled={closingAlertId === alert._id}
                      className="btn-success block w-full disabled:opacity-60"
                    >
                      {closingAlertId === alert._id ? 'Closing case...' : '✅ Close Case'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 text-neutral-900">Past Alerts ({pastAlerts.length})</h2>

          {pastAlerts.length === 0 ? (
            <div className="p-8 card-elevated text-center border border-neutral-200">
              <p className="text-neutral-600">No past alerts</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg border border-neutral-200 shadow-sm">
              <table className="w-full">
                <thead className="bg-neutral-100 border-b border-neutral-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">Date/Time</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">Patient</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">Blood Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">Phone</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">Closed By</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {pastAlerts.map((alert) => (
                    <tr key={alert._id} className="hover:bg-neutral-50">
                      <td className="px-6 py-3 text-sm text-neutral-700">{formatTime(alert.triggeredAt)}</td>
                      <td className="px-6 py-3 text-sm font-medium text-neutral-900">{alert.victimName || 'Unknown'}</td>
                      <td className="px-6 py-3 text-sm">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                          {alert.victimBloodType || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <a href={`tel:${alert.victimPhone}`} className="text-blue-600 hover:text-blue-700 underline">
                          {maskPhoneNumber(alert.victimPhone)}
                        </a>
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            alert.status === 'resolved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-neutral-700">{alert.closedByEmail || 'System'}</td>
                      <td className="px-6 py-3 text-sm">
                        <a
                          href={getNavLink(alert.responderLocation?.lat, alert.responderLocation?.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 underline font-semibold"
                        >
                          Navigate
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
