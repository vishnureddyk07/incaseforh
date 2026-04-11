import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { maskPhoneNumber } from '../utils/privacy';

interface SosAlert {
  _id: string;
  victimPhone: string;
  victimName: string;
  victimBloodType?: string;
  victimAllergies?: string;
  victimMedications?: string;
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

export default function PoliceDashboard() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [closingAlertId, setClosingAlertId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(true);

  // Fetch alerts from API
  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/police/login');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/sos`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          navigate('/police/login');
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
    // Load user data
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Initial fetch
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
    navigate('/police/login');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getMapLink = (lat?: number, lng?: number) => {
    if (!lat || !lng) return '#';
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  const closeCase = async (alertId: string) => {
    try {
      setClosingAlertId(alertId);
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/police/login');
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
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">👮</div>
            <div>
              <h1 className="text-2xl font-bold">Police Control Room</h1>
              <p className="text-sm text-neutral-600">SOS Alert Management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p className="text-neutral-700">{user?.email}</p>
              <p className="text-xs text-neutral-500">Last refresh: {lastRefresh.toLocaleTimeString()}</p>
              <p className={`text-xs ${isLive ? 'text-emerald-400' : 'text-amber-400'}`}>
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
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Active Alerts Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">🚨</span>
            Active Alerts ({activeAlerts.length})
          </h2>

          {loading ? (
            <div className="p-8 card-elevated text-center border border-neutral-200">
              <p className="text-neutral-500">Loading alerts...</p>
            </div>
          ) : activeAlerts.length === 0 ? (
            <div className="p-8 card-elevated text-center border border-neutral-200">
              <p className="text-neutral-500">No active alerts at this time</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeAlerts.map((alert) => (
                <div
                  key={alert._id}
                  className="card-elevated border-2 border-red-400 p-6 animate-pulse-soft"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-2xl animate-bounce">🔴</div>
                        <h3 className="text-xl font-bold text-red-400">ACTIVE EMERGENCY</h3>
                      </div>
                      <p className="text-sm text-neutral-700 mb-2">
                        <strong>Alert ID:</strong> {alert._id}
                      </p>
                      <p className="text-sm text-neutral-700 mb-2">
                        <strong>Triggered:</strong> {formatTime(alert.triggeredAt)}
                      </p>
                      <p className="text-sm text-neutral-700 mb-2">
                        <strong>Caller:</strong> {maskPhoneNumber(alert.victimPhone)}
                      </p>
                      <p className="text-sm text-neutral-700 mb-2">
                        <strong>Device ID:</strong> {alert.responderDeviceId || 'Not available'}
                      </p>
                      <p className="text-sm text-neutral-700 mb-2">
                        <strong>GPS Accuracy:</strong>{' '}
                        {typeof alert.responderLocationAccuracy === 'number'
                          ? `±${Math.round(alert.responderLocationAccuracy)}m`
                          : 'Unknown'}
                      </p>
                      <p className="text-sm text-neutral-700 mb-2">
                        <strong>Device Info:</strong> {alert.responderUserAgent}
                      </p>
                      <p className="text-sm text-neutral-700">
                        <strong>Location IP:</strong> {alert.responderIP}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <a
                        href={getMapLink(alert.responderLocation?.lat, alert.responderLocation?.lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary-sm whitespace-nowrap"
                      >
                        📍 View Location
                      </a>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${alert.responderLocation?.lat},${alert.responderLocation?.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-success whitespace-nowrap"
                      >
                        🗺️ Navigate
                      </a>
                      <button
                        type="button"
                        onClick={() => closeCase(alert._id)}
                        disabled={closingAlertId === alert._id}
                        className="btn-success whitespace-nowrap disabled:opacity-60"
                      >
                        {closingAlertId === alert._id ? 'Closing...' : '✅ Close Case'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Past Alerts Section */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Past Alerts ({pastAlerts.length})</h2>

          {pastAlerts.length === 0 ? (
            <div className="p-8 card-elevated text-center border border-neutral-200">
              <p className="text-neutral-500">No past alerts</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg border border-neutral-200">
              <table className="w-full">
                <thead className="bg-neutral-100 border-b border-neutral-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Time</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Phone</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Closed By</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {pastAlerts.map((alert) => (
                    <tr key={alert._id} className="hover:bg-neutral-50">
                      <td className="px-6 py-3 text-sm">{formatTime(alert.triggeredAt)}</td>
                      <td className="px-6 py-3 text-sm">{alert.victimPhone}</td>
                      <td className="px-6 py-3 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            alert.status === 'resolved'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm">{alert.closedByEmail || 'System'}</td>
                      <td className="px-6 py-3 text-sm">
                        <a
                          href={getMapLink(alert.responderLocation?.lat, alert.responderLocation?.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 underline"
                        >
                          View Map
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
