import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

interface SosAlert {
  _id: string;
  victimPhone: string;
  victimName: string;
  victimBloodType?: string;
  victimAllergies?: string;
  victimMedications?: string;
  victimEmergencyContacts?: EmergencyContact[];
  responderLocation?: { lat: number; lng: number };
  responderIP?: string;
  responderUserAgent?: string;
  triggeredAt: string;
  status: 'active' | 'resolved' | 'cancelled';
}

export default function AmbulanceDashboard() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Fetch alerts from API
  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/ambulance/login');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/sos`, {
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
    // Load user data
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Initial fetch
    fetchAlerts();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAlerts();
      setLastRefresh(new Date());
    }, 30000);

    return () => clearInterval(interval);
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

  const getNavLink = (lat?: number, lng?: number) => {
    if (!lat || !lng) return '#';
    return `https://www.google.com/maps?api=1&destination=${lat},${lng}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🚑</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Medical Control Room</h1>
              <p className="text-sm text-gray-600">Emergency Response Dispatch</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p className="text-gray-700">{user?.email}</p>
              <p className="text-xs text-gray-500">Last refresh: {lastRefresh.toLocaleTimeString()}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Active Alerts Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-900">
            <span className="text-2xl">🚨</span>
            Active Medical Emergencies ({activeAlerts.length})
          </h2>

          {activeAlerts.length === 0 ? (
            <div className="p-8 bg-white rounded-lg text-center border border-gray-200">
              <p className="text-gray-600">No active emergencies at this time</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeAlerts.map((alert) => (
                <div key={alert._id} className="bg-white rounded-lg shadow-md border-2 border-orange-400">
                  {/* Alert Banner */}
                  <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-3 animate-pulse">
                    <p className="text-white font-bold text-lg">🚨 ACTIVE EMERGENCY RESPONSE REQUIRED</p>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Patient Information Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">Patient Name</p>
                        <p className="text-2xl font-bold text-gray-900">{alert.victimName || 'Unknown'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">Emergency Call</p>
                        <a
                          href={`tel:${alert.victimPhone}`}
                          className="text-2xl font-bold text-red-600 hover:text-red-700 underline break-all"
                        >
                          {alert.victimPhone}
                        </a>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg border border-red-300">
                        <p className="text-xs text-red-700 uppercase tracking-wide font-semibold mb-1">Blood Type</p>
                        <p className="text-2xl font-bold text-red-600">{alert.victimBloodType || 'Unknown'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">Alert ID</p>
                        <p className="text-sm font-mono text-gray-700 break-all">{alert._id}</p>
                      </div>
                    </div>

                    {/* Medical Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg border border-red-200 bg-red-50">
                        <h4 className="font-semibold text-red-900 mb-2">⚠️ Allergies</h4>
                        <p className="text-sm text-red-800">{alert.victimAllergies || 'No known allergies'}</p>
                      </div>
                      <div className="p-4 rounded-lg border border-orange-200 bg-orange-50">
                        <h4 className="font-semibold text-orange-900 mb-2">💊 Current Medications</h4>
                        <p className="text-sm text-orange-800">{alert.victimMedications || 'No medications listed'}</p>
                      </div>
                    </div>

                    {/* Emergency Contacts */}
                    {alert.victimEmergencyContacts && alert.victimEmergencyContacts.length > 0 && (
                      <div className="border-t border-gray-200 pt-6">
                        <h4 className="font-semibold text-gray-900 mb-3">👥 Emergency Contacts</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {alert.victimEmergencyContacts.map((contact, idx) => (
                            <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                              <p className="font-semibold text-gray-900">{contact.name}</p>
                              <p className="text-sm text-gray-600 mb-2">{contact.relationship}</p>
                              <a
                                href={`tel:${contact.phone}`}
                                className="inline-block px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold transition-colors"
                              >
                                📞 Call
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Location & Navigation */}
                    <div className="border-t border-gray-200 pt-6 grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-700 uppercase tracking-wide font-semibold mb-2">GPS Coordinates</p>
                        <p className="font-mono text-sm text-blue-900">
                          {alert.responderLocation
                            ? `${alert.responderLocation.lat.toFixed(6)}, ${alert.responderLocation.lng.toFixed(6)}`
                            : 'Location unavailable'}
                        </p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <p className="text-xs text-green-700 uppercase tracking-wide font-semibold mb-2">Incident Time</p>
                        <p className="text-sm text-green-900">{formatTime(alert.triggeredAt)}</p>
                      </div>
                    </div>

                    {/* Navigation Button */}
                    <a
                      href={getNavLink(alert.responderLocation?.lat, alert.responderLocation?.lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-lg text-center transition-colors"
                    >
                      🗺️ Open Navigation
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Past Alerts Section */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Past Alerts ({pastAlerts.length})</h2>

          {pastAlerts.length === 0 ? (
            <div className="p-8 bg-white rounded-lg text-center border border-gray-200">
              <p className="text-gray-600">No past alerts</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date/Time</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Patient</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Blood Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Phone</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pastAlerts.map((alert) => (
                    <tr key={alert._id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-700">{formatTime(alert.triggeredAt)}</td>
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">{alert.victimName || 'Unknown'}</td>
                      <td className="px-6 py-3 text-sm">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                          {alert.victimBloodType || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <a href={`tel:${alert.victimPhone}`} className="text-blue-600 hover:text-blue-700 underline">
                          {alert.victimPhone}
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
