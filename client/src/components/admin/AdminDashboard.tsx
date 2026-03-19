import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface UserRow {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
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
  const [totalEmergencyRecords, setTotalEmergencyRecords] = useState(0);
  const [isFetchingEmergencyCount, setIsFetchingEmergencyCount] = useState(false);
  const [expandedDetailsRows, setExpandedDetailsRows] = useState<Record<string, boolean>>({});
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      navigate('/admin');
      return;
    }
  }, [isAuthenticated, user, navigate]);

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(null), 3000);
  };

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
      .then((data) => {
        const users = Array.isArray(data) ? data : data?.users;
        setSystemUsersList(Array.isArray(users) ? users : []);
      })
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
      .then((data) => {
        const logs = Array.isArray(data) ? data : data?.logs;
        setSystemActionLogs(Array.isArray(logs) ? logs : []);
      })
      .catch((e) => setAdminDashboardError(e.message))
      .finally(() => setIsFetchingActivityLogs(false));
  };

  const fetchEmergencyRecordsCount = async () => {
    if (!token) return;
    setIsFetchingEmergencyCount(true);
    try {
      const res = await fetch(`${backendApiBaseUrl}/api/v1/emergency`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch emergency records');
      const data = await res.json();
      const records = Array.isArray(data) ? data : data?.records || data?.data || [];
      setTotalEmergencyRecords(Array.isArray(records) ? records.length : 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch emergency records';
      setAdminDashboardError(msg);
    } finally {
      setIsFetchingEmergencyCount(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchLogs();
    fetchEmergencyRecordsCount();
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
      fetchLogs();
      showToast('✅ Manager created successfully!');
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
      fetchLogs();
      showToast('🗑️ User deleted successfully!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user';
      setAdminDashboardError(msg);
    }
  };

  const formatDateTime = (dateValue?: string) => {
    if (!dateValue) return '—';
    const dt = new Date(dateValue);
    if (Number.isNaN(dt.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dt);
  };

  const getRoleBadgeClass = (role: UserRow['role'] | string) => {
    if (role === 'admin') return 'bg-red-100 text-red-700 border-red-200';
    if (role === 'manager') return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  const getActionBadgeClass = (action: string) => {
    if (action.includes('sos')) return 'bg-red-100 text-red-700 border-red-200';
    if (action === 'qr_scan') return 'bg-orange-100 text-orange-700 border-orange-200';
    if (action === 'login') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (action.includes('delete')) return 'bg-red-100 text-red-700 border-red-200';
    if (action.includes('create')) return 'bg-green-100 text-green-700 border-green-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getActionLabel = (action: string) => {
    if (action.includes('sos')) return 'SOS triggered';
    return action;
  };

  const toCsvCell = (value: unknown) => {
    const normalized = String(value ?? '').replace(/"/g, '""');
    return `"${normalized}"`;
  };

  const downloadCsv = (filename: string, headers: string[], rows: Array<Array<unknown>>) => {
    const csv = [headers.map(toCsvCell).join(','), ...rows.map((row) => row.map(toCsvCell).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportUsersCsv = () => {
    const rows = systemUsersList.map((u) => [u.id, u.email, u.role, formatDateTime(u.createdAt)]);
    downloadCsv('users-export.csv', ['ID', 'Email', 'Role', 'Created At'], rows);
  };

  const exportLogsCsv = () => {
    const rows = systemActionLogs.map((log) => [
      log.id,
      formatDateTime(log.createdAt),
      log.actorEmail,
      log.actorRole,
      log.action,
      JSON.stringify(log.details || {}),
    ]);
    downloadCsv('audit-logs-export.csv', ['ID', 'When', 'Actor', 'Role', 'Action', 'Details'], rows);
  };

  const managerCount = useMemo(
    () => systemUsersList.filter((u) => u.role === 'manager').length,
    [systemUsersList]
  );

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return systemUsersList;
    const q = userSearchQuery.toLowerCase();
    return systemUsersList.filter(
      (u) => u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
    );
  }, [systemUsersList, userSearchQuery]);

  const filteredLogs = useMemo(() => {
    if (!logSearchQuery.trim()) return systemActionLogs;
    const q = logSearchQuery.toLowerCase();
    return systemActionLogs.filter(
      (log) =>
        log.actorEmail.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.actorRole.toLowerCase().includes(q)
    );
  }, [systemActionLogs, logSearchQuery]);

  const toggleDetails = (logId: string) => {
    setExpandedDetailsRows((prev) => ({ ...prev, [logId]: !prev[logId] }));
  };

  const quickRefresh = () => {
    fetchUsers();
    fetchLogs();
    fetchEmergencyRecordsCount();
    showToast('🔄 Data refreshed!');
  };

  const statCards = [
    {
      label: 'Total Users',
      value: systemUsersList.length,
      icon: '👥',
      color: 'bg-blue-50 border-blue-100',
      textColor: 'text-blue-700',
    },
    {
      label: 'Total Managers',
      value: managerCount,
      icon: '🛡️',
      color: 'bg-purple-50 border-purple-100',
      textColor: 'text-purple-700',
    },
    {
      label: 'QR Records',
      value: isFetchingEmergencyCount ? '...' : totalEmergencyRecords,
      icon: '📋',
      color: 'bg-green-50 border-green-100',
      textColor: 'text-green-700',
    },
    {
      label: 'Audit Logs',
      value: systemActionLogs.length,
      icon: '🔍',
      color: 'bg-orange-50 border-orange-100',
      textColor: 'text-orange-700',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Success Toast */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-gray-900 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {successToast}
        </div>
      )}

      <div className="mx-auto flex max-w-[1600px]">
        {/* Sidebar */}
        <aside className="sticky top-0 h-screen w-64 bg-gray-900 px-6 py-8 text-white shadow-xl flex flex-col">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400">INcase Admin</p>
            <h1 className="mt-2 text-2xl font-semibold">Control Center</h1>
            {user?.email && (
              <p className="mt-2 text-xs text-gray-400 truncate">Logged in as: {user.email}</p>
            )}
          </div>

          <nav className="mt-10 space-y-1 text-sm flex-1">
            <a href="#dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-200 hover:bg-gray-800">
              <span>🏠</span> Dashboard
            </a>
            <Link to="/qrs" className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-200 hover:bg-gray-800">
              <span>📋</span> Emergency Records
            </Link>
            <a href="#users" className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-200 hover:bg-gray-800">
              <span>👥</span> Users
            </a>
            <a href="#audit-logs" className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-200 hover:bg-gray-800">
              <span>🔍</span> Audit Logs
            </a>
            <Link to="/change-password" className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-200 hover:bg-gray-800">
              <span>🔑</span> Change Password
            </Link>
          </nav>

          <button
            onClick={quickRefresh}
            className="mt-4 w-full rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
          >
            🔄 Refresh Data
          </button>
        </aside>

        {/* Main Content */}
        <main className="w-full p-6 md:p-10">
          {/* Header */}
          <div id="dashboard" className="mb-8 flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-semibold text-gray-900">Admin Dashboard</h2>
              <p className="mt-1 text-sm text-gray-500">Monitor users, managers, emergency records, and security activity.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={exportUsersCsv}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ⬇️ Export Users
              </button>
              <button
                onClick={exportLogsCsv}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                ⬇️ Export Logs
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {adminDashboardError && (
            <div className="mb-6 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>⚠️ {adminDashboardError}</span>
              <button onClick={() => setAdminDashboardError(null)} className="ml-4 text-red-500 hover:text-red-700 font-bold">✕</button>
            </div>
          )}

          {/* Stat Cards */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <div key={card.label} className={`rounded-xl border p-5 shadow-sm ${card.color}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">{card.label}</p>
                  <span className="text-2xl">{card.icon}</span>
                </div>
                <p className={`mt-3 text-3xl font-bold ${card.textColor}`}>{card.value}</p>
              </div>
            ))}
          </section>

          {/* Create Manager */}
          <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">➕ Create Manager Account</h3>
            <p className="mt-1 text-sm text-gray-500">New managers can log in and manage emergency records.</p>
            <form onSubmit={createManager} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700">Manager Email</label>
                <input
                  value={newManagerEmail}
                  onChange={(e) => setNewManagerEmail(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="manager@example.com"
                  type="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Temporary Password</label>
                <input
                  value={newManagerPassword}
                  onChange={(e) => setNewManagerPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="min 6 characters"
                  type="password"
                />
              </div>
              <button
                type="submit"
                disabled={isCreatingManager || !newManagerEmail || !newManagerPassword}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 font-medium"
              >
                {isCreatingManager ? 'Creating...' : '➕ Create Manager'}
              </button>
            </form>
          </section>

          {/* Users Table */}
          <section id="users" className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-gray-900">👥 Users ({filteredUsers.length})</h3>
              <div className="flex gap-2">
                <input
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search by email or role..."
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-56"
                />
                <button onClick={fetchUsers} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                  🔄
                </button>
              </div>
            </div>

            {isFetchingUsers ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
                <span className="animate-spin">⏳</span> Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                {userSearchQuery ? '🔍 No users match your search.' : '👥 No users found.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-500">
                      <th className="py-3 px-2 font-medium">Email</th>
                      <th className="py-3 px-2 font-medium">Role</th>
                      <th className="py-3 px-2 font-medium">Created</th>
                      <th className="py-3 px-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((userAccount) => (
                      <tr key={userAccount.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-2 text-gray-900">{userAccount.email}</td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getRoleBadgeClass(userAccount.role)}`}>
                            {userAccount.role}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-gray-500 text-xs">{formatDateTime(userAccount.createdAt)}</td>
                        <td className="py-3 px-2">
                          {userAccount.role !== 'admin' && (
                            <button
                              onClick={() => deleteUser(userAccount.id)}
                              className="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Audit Logs Table */}
          <section id="audit-logs" className="mt-8 mb-10 rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-gray-900">🔍 Audit Logs ({filteredLogs.length})</h3>
              <div className="flex gap-2">
                <input
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  placeholder="Search by email or action..."
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-56"
                />
                <button onClick={fetchLogs} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                  🔄
                </button>
              </div>
            </div>

            {isFetchingActivityLogs ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
                <span className="animate-spin">⏳</span> Loading logs...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                {logSearchQuery ? '🔍 No logs match your search.' : '📋 No audit logs yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-500">
                      <th className="py-3 px-2 font-medium">When</th>
                      <th className="py-3 px-2 font-medium">Actor</th>
                      <th className="py-3 px-2 font-medium">Role</th>
                      <th className="py-3 px-2 font-medium">Action</th>
                      <th className="py-3 px-2 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((activityLog) => {
                      const detailsText = activityLog.details ? JSON.stringify(activityLog.details) : '—';
                      const isExpanded = Boolean(expandedDetailsRows[activityLog.id]);
                      const isLong = detailsText.length > 120;
                      const renderedDetails = isLong && !isExpanded ? `${detailsText.slice(0, 120)}...` : detailsText;

                      return (
                        <tr key={activityLog.id} className="border-b border-gray-100 align-top hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-2 text-gray-500 text-xs whitespace-nowrap">{formatDateTime(activityLog.createdAt)}</td>
                          <td className="py-3 px-2 text-gray-900 text-xs">{activityLog.actorEmail}</td>
                          <td className="py-3 px-2">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getRoleBadgeClass(activityLog.actorRole)}`}>
                              {activityLog.actorRole}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getActionBadgeClass(activityLog.action)}`}>
                              {getActionLabel(activityLog.action)}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <p className="max-w-lg whitespace-pre-wrap break-words text-xs text-gray-600">{renderedDetails}</p>
                            {isLong && (
                              <button
                                onClick={() => toggleDetails(activityLog.id)}
                                className="mt-1 text-xs font-medium text-blue-600 hover:underline"
                              >
                                {isExpanded ? '▲ Show less' : '▼ Show more'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}