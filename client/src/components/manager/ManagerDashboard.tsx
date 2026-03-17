import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface EmergencyInfo {
  _id: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  createdAt?: string;
  bloodType?: string;
}

export default function ManagerDashboard() {
  const { isAuthenticated, user, token } = useAuth();
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com';
  const [records, setRecords] = useState<EmergencyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    if (user?.role === 'admin') {
      navigate('/admin/dashboard');
      return;
    }
    if (user?.role !== 'manager') {
      navigate('/manager');
    }
  }, [isAuthenticated, token, user, navigate]);

  const fetchRecords = () => {
    if (!token) return;
    setLoading(true);
    fetch(`${apiBase}/api/v1/emergency`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load records');
        return res.json();
      })
      .then((data) => setRecords(data.records || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const sorted = useMemo(() => {
    return [...records].sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [records]);

  const createEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empEmail || !empPassword) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/v1/manager/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: empEmail, password: empPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create employee');
      }
      setEmpEmail('');
      setEmpPassword('');
      alert('Employee credentials created and logged for admin review.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create employee';
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleOpen = (record: EmergencyInfo) => {
    const identifier = (record.email && record.email.trim()) || (record.phoneNumber && record.phoneNumber.trim());
    if (!identifier) {
      alert('No email or phone number available for this record');
      return;
    }
    navigate(`/emergencyinfo/${encodeURIComponent(identifier)}`);
  };

  if (!isAuthenticated || user?.role !== 'manager') {
    return (
      <div className="min-h-screen flex items-center justify-center">Access restricted to managers.</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
          <div className="flex gap-3">
            <Link to="/" className="px-4 py-2 border rounded hover:bg-gray-100">Home</Link>
            <button onClick={fetchRecords} className="px-4 py-2 border rounded hover:bg-gray-100">Refresh</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Create Employee Credentials</h2>
          <form onSubmit={createEmployee} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700">Employee Email</label>
              <input value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" placeholder="employee@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Temporary Password</label>
              <input value={empPassword} onChange={(e) => setEmpPassword(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" placeholder="min 6 chars" />
            </div>
            <button disabled={creating} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{creating ? 'Creating…' : 'Create'}</button>
          </form>
          <p className="mt-2 text-sm text-gray-600">All manager actions are logged for admin review.</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Emergency Records (view-only)</h2>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-600">
                    <th className="py-2">Name</th>
                    <th className="py-2">Email</th>
                    <th className="py-2">Phone</th>
                    <th className="py-2">Blood Type</th>
                    <th className="py-2">Created</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr key={r._id} className="border-t">
                      <td className="py-2 font-medium">{r.fullName}</td>
                      <td className="py-2">{r.email || '—'}</td>
                      <td className="py-2">{r.phoneNumber || '—'}</td>
                      <td className="py-2">{r.bloodType || '—'}</td>
                      <td className="py-2">{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
                      <td className="py-2">
                        <button className="text-orange-600 hover:underline" onClick={() => handleOpen(r)}>Open</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
