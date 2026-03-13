import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface UserRow {
  id: string;
  email: string;
  role: 'admin' | 'manager';
  createdAt?: string;
}

interface LogEntry {
  id: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  details?: Record<string, unknown>;
  createdAt?: string;
}

export default function AdminDashboard() {
  const { isAuthenticated, user, token } = useAuth();
  const navigate = useNavigate();
  const backendApiBaseUrl = import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com';
  const [systemUsersList, setSystemUsersList] = useState<UserRow[]>([]);
  const [isFetchingUsers, setIsFetchingUsers] = useState(true);
  const [adminDashboardError, setAdminDashboardError] = useState<string | null>(null);
  const [newManagerEmail, setNewManagerEmail] = useState('');
  const [newManagerPassword, setNewManagerPassword] = useState('');
  const [isCreatingManager, setIsCreatingManager] = useState(false);
  const [systemActionLogs, setSystemActionLogs] = useState<LogEntry[]>([]);
  const [isFetchingActivityLogs, setIsFetchingActivityLogs] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      navigate('/admin');
      return;
    }
  }, [isAuthenticated, user, navigate]);

  const fetchUsers = () => {
    if (!token) return;
    setIsFetchingUsers(true);
    fetch(`${backendApiBaseUrl}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch users');
        return r.json();
      })
      .then((data) => setSystemUsersList(data))
      .catch((e) => setAdminDashboardError(e.message))
      .finally(() => setIsFetchingUsers(false));
  };

  const fetchLogs = () => {
    if (!token) return;
    setIsFetchingActivityLogs(true);
    fetch(`${backendApiBaseUrl}/api/v1/admin/logs`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch logs');
        return r.json();
      })
      .then((data) => setSystemActionLogs(data))
      .catch((e) => setAdminDashboardError(e.message))
      .finally(() => setIsFetchingActivityLogs(false));
  };

  useEffect(() => {
    fetchUsers();
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const createManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManagerEmail || !newManagerPassword) return;
    setIsCreatingManager(true);
    setAdminDashboardError(null);
    try {
      const res = await fetch(`${backendApiBaseUrl}/api/v1/admin/users/manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: newManagerEmail, password: newManagerPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create manager');
      }
      setNewManagerEmail('');
      setNewManagerPassword('');
      fetchUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create manager';
      setAdminDashboardError(msg);
    } finally {
      setIsCreatingManager(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Delete this user?')) return;
    try {
      const res = await fetch(`${backendApiBaseUrl}/api/v1/admin/users/${userId}`, {
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
      setAdminDashboardError(msg);
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
              <input value={newManagerEmail} onChange={(e) => setNewManagerEmail(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" placeholder="manager@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Temporary Password</label>
              <input value={newManagerPassword} onChange={(e) => setNewManagerPassword(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" placeholder="min 6 chars" />
            </div>
            <button disabled={isCreatingManager} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{isCreatingManager ? 'Creating...' : 'Create'}</button>
          </form>
        </div>

        {/* Manage Users */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Users</h2>
            <button onClick={fetchUsers} className="text-sm px-3 py-1 border rounded hover:bg-gray-100">Refresh</button>
          </div>
          {adminDashboardError && <p className="text-sm text-red-600 mb-3">{adminDashboardError}</p>}
          {isFetchingUsers ? (
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
                  {systemUsersList.map((userAccount) => (
                    <tr key={userAccount.id} className="border-t">
                      <td className="py-2">{userAccount.email}</td>
                      <td className="py-2 capitalize">{userAccount.role}</td>
                      <td className="py-2">
                        {userAccount.role !== 'admin' && (
                          <button onClick={() => deleteUser(userAccount.id)} className="text-sm text-red-600 hover:underline">Delete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Manager/Admin activity log */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Manager Activity Log</h2>
            <button onClick={fetchLogs} className="text-sm px-3 py-1 border rounded hover:bg-gray-100">Refresh</button>
          </div>
          {isFetchingActivityLogs ? (
            <p>Loading...</p>
          ) : systemActionLogs.length === 0 ? (
            <p className="text-sm text-gray-600">No recent actions.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-600">
                    <th className="py-2">When</th>
                    <th className="py-2">Actor</th>
                    <th className="py-2">Role</th>
                    <th className="py-2">Action</th>
                    <th className="py-2">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {systemActionLogs.map((activityLog) => (
                    <tr key={activityLog.id} className="border-t">
                      <td className="py-2">{activityLog.createdAt ? new Date(activityLog.createdAt).toLocaleString() : '—'}</td>
                      <td className="py-2">{activityLog.actorEmail}</td>
                      <td className="py-2 capitalize">{activityLog.actorRole}</td>
                      <td className="py-2 font-medium">
                        {activityLog.action === 'qr_scan' ? '🔍 QR Scanned' : activityLog.action}
                      </td>
                      <td className="py-2 text-gray-600 text-xs">
                        {activityLog.details ? (
                          <div className="space-y-1">
                            {activityLog.details.victimName && <div><strong>Victim:</strong> {activityLog.details.victimName as string}</div>}
                            {activityLog.details.scannerIP && <div><strong>Scanner IP:</strong> {activityLog.details.scannerIP as string}</div>}
                            {activityLog.details.scannedAt && <div><strong>Scanned:</strong> {new Date(activityLog.details.scannedAt as string).toLocaleString()}</div>}
                            {activityLog.details.userAgent && <div className="truncate max-w-xs" title={activityLog.details.userAgent as string}><strong>Device:</strong> {(activityLog.details.userAgent as string).substring(0, 50)}...</div>}
                          </div>
                        ) : '—'}
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
