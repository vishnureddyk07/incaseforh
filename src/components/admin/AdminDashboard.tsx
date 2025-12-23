import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface UserRow {
  id: string;
  email: string;
  role: 'admin' | 'manager';
  createdAt?: string;
}

export default function AdminDashboard() {
  const { isAuthenticated, user, token } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      navigate('/admin');
      return;
    }
  }, [isAuthenticated, user, navigate]);

  const fetchUsers = () => {
    if (!token) return;
    setLoading(true);
    fetch('https://incaseforh.onrender.com/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch users');
        return r.json();
      })
      .then((data) => setUsers(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const createManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerEmail || !managerPassword) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('https://incaseforh.onrender.com/api/admin/users/manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: managerEmail, password: managerPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create manager');
      }
      setManagerEmail('');
      setManagerPassword('');
      fetchUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create manager';
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    try {
      const res = await fetch(`https://incaseforh.onrender.com/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to delete user');
      }
      fetchUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex gap-3">
            <Link to="/qrs" className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">View Emergency Records</Link>
            <Link to="/change-password" className="px-4 py-2 border rounded hover:bg-gray-100">Change Password</Link>
          </div>
        </div>

        {/* Create Manager */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Create Manager</h2>
          <form onSubmit={createManager} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700">Manager Email</label>
              <input value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" placeholder="manager@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Temporary Password</label>
              <input value={managerPassword} onChange={(e) => setManagerPassword(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" placeholder="min 6 chars" />
            </div>
            <button disabled={creating} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{creating ? 'Creating...' : 'Create'}</button>
          </form>
        </div>

        {/* Manage Users */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Users</h2>
            <button onClick={fetchUsers} className="text-sm px-3 py-1 border rounded hover:bg-gray-100">Refresh</button>
          </div>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-sm text-gray-600">
                    <th className="py-2">Email/ID</th>
                    <th className="py-2">Role</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="py-2">{u.email}</td>
                      <td className="py-2 capitalize">{u.role}</td>
                      <td className="py-2">
                        {u.role !== 'admin' && (
                          <button onClick={() => deleteUser(u.id)} className="text-sm text-red-600 hover:underline">Delete</button>
                        )}
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
