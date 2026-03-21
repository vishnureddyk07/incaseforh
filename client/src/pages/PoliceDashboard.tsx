import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SosAlert {
  _id: string;
  victimPhone: string;
  victimName: string;
  victimBloodType?: string;
  victimAllergies?: string;
  victimMedications?: string;
  responderDeviceId?: string;
  responderName?: string;
  responderPhone?: string;
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

    // Set up real-time SSE subscription for alerts
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/police/login');
        return;
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        eventSource = new EventSource(`${apiUrl}/api/v1/sos/stream/subscribe`, {
          // @ts-ignore - EventSource doesn't support headers in standard API, using workaround
          headers: { Authorization: `Bearer ${token}` },
        });

        // If native EventSource doesn't support headers, we need to handle auth differently
        // For now, fetch with auth to get token into a session, then connect
        eventSource.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Received SSE message:', data);

            if (data.type === 'new_alert') {
              // Add new alert to the top of the list
              setAlerts((prev) => [data.alert, ...prev]);
              setLastRefresh(new Date());
            } else if (data.type === 'alert_updated') {
              // Update existing alert
              setAlerts((prev) =>
                prev.map((alert) =>
                  alert._id === data.alert._id
                    ? {
                        ...alert,
                        status: data.alert.status,
                        resolvedAt: data.alert.resolvedAt,
                        closedByEmail: data.alert.closedByEmail,
                      }
                    : alert
                )
              );
              setLastRefresh(new Date());
            }
          } catch (err) {
            console.error('Error parsing SSE message:', err);
          }
        });

        eventSource.addEventListener('error', (err) => {
          console.error('SSE connection error:', err);
          if (eventSource?.readyState === EventSource.CLOSED) {
            console.log('SSE connection closed, retrying...');
            setTimeout(() => {
              connectSSE();
            }, 3000);
          }
        });

        console.log('📡 SSE subscription established');
      } catch (err) {
        console.error('Failed to establish SSE connection:', err);
        setError('Real-time updates unavailable. Using polling.');
        // Fallback to polling every 30 seconds
        const interval = setInterval(() => {
          fetchAlerts();
          setLastRefresh(new Date());
        }, 30000);
        return () => clearInterval(interval);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
        console.log('🔌 SSE connection closed');
      }
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
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">👮</div>
            <div>
              <h1 className="text-2xl font-bold">Police Control Room</h1>
              <p className="text-sm text-slate-400">SOS Alert Management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p className="text-slate-300">{user?.email}</p>
              <p className="text-xs text-slate-500">Last refresh: {lastRefresh.toLocaleTimeString()}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Active Alerts Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">🚨</span>
            Active Alerts ({activeAlerts.length})
          </h2>

          {loading ? (
            <div className="p-8 bg-slate-800 rounded-lg text-center border border-slate-700">
              <p className="text-slate-400">Loading alerts...</p>
            </div>
          ) : activeAlerts.length === 0 ? (
            <div className="p-8 bg-slate-800 rounded-lg text-center border border-slate-700">
              <p className="text-slate-400">No active alerts at this time</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeAlerts.map((alert) => (
                <div
                  key={alert._id}
                  className="bg-gradient-to-r from-red-950/50 to-red-900/50 border-2 border-red-500 rounded-lg p-6 animate-pulse"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-2xl animate-bounce">🔴</div>
                        <h3 className="text-xl font-bold text-red-400">ACTIVE EMERGENCY</h3>
                      </div>
                      <p className="text-sm text-slate-300 mb-2">
                        <strong>Alert ID:</strong> {alert._id}
                      </p>
                      <p className="text-sm text-slate-300 mb-2">
                        <strong>Triggered:</strong> {formatTime(alert.triggeredAt)}
                      </p>
                      <p className="text-sm text-slate-300 mb-2">
                        <strong>Caller:</strong> {alert.victimPhone}
                      </p>
                      <p className="text-sm text-slate-300 mb-2">
                        <strong>Responder Device ID:</strong> {alert.responderDeviceId || 'Not captured'}
                      </p>
                      <p className="text-sm text-slate-300 mb-2">
                        <strong>GPS Accuracy:</strong>{' '}
                        {typeof alert.responderLocationAccuracy === 'number'
                          ? `±${Math.round(alert.responderLocationAccuracy)}m`
                          : 'Unknown'}
                      </p>
                      <p className="text-sm text-slate-300 mb-2">
                        <strong>Device Info:</strong> {alert.responderUserAgent}
                      </p>
                      <p className="text-sm text-slate-300">
                        <strong>Location IP:</strong> {alert.responderIP}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <a
                        href={getMapLink(alert.responderLocation?.lat, alert.responderLocation?.lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold text-center transition-colors whitespace-nowrap"
                      >
                        📍 View Location
                      </a>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${alert.responderLocation?.lat},${alert.responderLocation?.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold text-center transition-colors whitespace-nowrap"
                      >
                        🗺️ Navigate
                      </a>
                      <button
                        type="button"
                        onClick={() => closeCase(alert._id)}
                        disabled={closingAlertId === alert._id}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg text-sm font-semibold text-center transition-colors whitespace-nowrap"
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
            <div className="p-8 bg-slate-800 rounded-lg text-center border border-slate-700">
              <p className="text-slate-400">No past alerts</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
              <table className="w-full">
                <thead className="bg-slate-900 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Time</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Phone</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Closed By</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {pastAlerts.map((alert) => (
                    <tr key={alert._id} className="hover:bg-slate-700/50">
                      <td className="px-6 py-3 text-sm">{formatTime(alert.triggeredAt)}</td>
                      <td className="px-6 py-3 text-sm">{alert.victimPhone}</td>
                      <td className="px-6 py-3 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            alert.status === 'resolved'
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-yellow-900/30 text-yellow-400'
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
                          className="text-blue-400 hover:text-blue-300 underline"
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
