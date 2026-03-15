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
  const [searchQuery, setSearchQuery] = useState('');
  const [createSuccessMessage, setCreateSuccessMessage] = useState<string | null>(null);

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
    setError(null);
    fetch(`${apiBase}/api/v1/emergency`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load records');
        return res.json();
      })
      .then((data) => {
        const rows = Array.isArray(data) ? data : data?.records || data?.data || [];
        setRecords(Array.isArray(rows) ? rows : []);
      })
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

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sorted;

    return sorted.filter((record) => {
      const name = record.fullName?.toLowerCase() || '';
      const email = record.email?.toLowerCase() || '';
      const phone = record.phoneNumber?.toLowerCase() || '';
      return name.includes(query) || email.includes(query) || phone.includes(query);
    });
  }, [searchQuery, sorted]);

  const recordsThisMonth = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    return records.filter((record) => {
      if (!record.createdAt) return false;
      const dt = new Date(record.createdAt);
      return dt.getMonth() === month && dt.getFullYear() === year;
    }).length;
  }, [records]);

  const bloodTypeSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    for (const record of records) {
      const bloodType = (record.bloodType || 'Unknown').trim() || 'Unknown';
      summary[bloodType] = (summary[bloodType] || 0) + 1;
    }
    return Object.entries(summary).sort((a, b) => b[1] - a[1]);
  }, [records]);

  const createEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empEmail || !empPassword) return;
    setCreating(true);
    setError(null);
    setCreateSuccessMessage(null);
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
      setCreateSuccessMessage('Employee credentials created and logged for admin review.');
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
      setError('No email or phone number available for this record.');
      return;
    }
    navigate(`/emergencyinfo/${encodeURIComponent(identifier)}`);
  };

  const formatDate = (dateValue?: string) => {
    if (!dateValue) return '—';
    const dt = new Date(dateValue);
    if (Number.isNaN(dt.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dt);
  };

  const bloodTypeBadgeClass = (bloodType?: string) => {
    const bt = (bloodType || '').toUpperCase();
    if (bt === 'A+') return 'bg-red-100 text-red-700 border-red-200';
    if (bt === 'B+') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (bt === 'O+') return 'bg-green-100 text-green-700 border-green-200';
    if (bt === 'AB+') return 'bg-purple-100 text-purple-700 border-purple-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const toCsvCell = (value: unknown) => {
    const normalized = String(value ?? '').replace(/"/g, '""');
    return `"${normalized}"`;
  };

  const exportRecordsCsv = () => {
    const headers = ['ID', 'Full Name', 'Email', 'Phone Number', 'Blood Type', 'Created At'];
    const rows = filteredRecords.map((record) => [
      record._id,
      record.fullName,
      record.email || '',
      record.phoneNumber || '',
      record.bloodType || '',
      formatDate(record.createdAt),
    ]);
    const csv = [headers.map(toCsvCell).join(','), ...rows.map((r) => r.map(toCsvCell).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'emergency-records.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated || user?.role !== 'manager') {
    return (
      <div className="min-h-screen flex items-center justify-center">Access restricted to managers.</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto flex max-w-[1600px]">
        <aside className="sticky top-0 h-screen w-64 bg-gray-900 px-6 py-8 text-white shadow-xl">
          <p className="text-xs uppercase tracking-widest text-gray-400">INcase Manager</p>
          <h1 className="mt-2 text-2xl font-semibold">Operations Hub</h1>

          <nav className="mt-10 space-y-2 text-sm">
            <a href="#dashboard" className="block rounded-lg px-3 py-2 text-gray-200 hover:bg-gray-800">Dashboard</a>
            <a href="#records" className="block rounded-lg px-3 py-2 text-gray-200 hover:bg-gray-800">Emergency Records</a>
            <a href="#create-employee" className="block rounded-lg px-3 py-2 text-gray-200 hover:bg-gray-800">Create Employee</a>
            <Link to="/change-password" className="block rounded-lg px-3 py-2 text-gray-200 hover:bg-gray-800">Change Password</Link>
            <Link to="/" className="block rounded-lg px-3 py-2 text-gray-200 hover:bg-gray-800">Home</Link>
          </nav>

          <button
            onClick={fetchRecords}
            className="mt-8 w-full rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
          >
            Refresh Records
          </button>
        </aside>

        <main className="w-full p-6 md:p-10">
          <div id="dashboard" className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-3xl font-semibold text-gray-900">Manager Dashboard</h2>
                <p className="mt-1 text-sm text-gray-500">Manage employees and monitor emergency records in real time.</p>
              </div>
              <button
                onClick={exportRecordsCsv}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Export Records CSV
              </button>
            </div>
          </div>

          {(error || createSuccessMessage) && (
            <div className="mb-6 space-y-3">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}
              {createSuccessMessage && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {createSuccessMessage}
                </div>
              )}
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Total Records</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{records.length}</p>
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Records This Month</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{recordsThisMonth}</p>
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Blood Types Summary</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {bloodTypeSummary.length === 0 ? (
                  <span className="text-sm text-gray-500">No records yet</span>
                ) : (
                  bloodTypeSummary.map(([bloodType, count]) => (
                    <span
                      key={bloodType}
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${bloodTypeBadgeClass(bloodType)}`}
                    >
                      {bloodType}: {count}
                    </span>
                  ))
                )}
              </div>
            </div>
          </section>

          <section id="create-employee" className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Create Employee Credentials</h3>
            <form onSubmit={createEmployee} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee Email</label>
                <input
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="employee@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Temporary Password</label>
                <input
                  value={empPassword}
                  onChange={(e) => setEmpPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="min 6 chars"
                  type="password"
                />
              </div>
              <button
                disabled={creating}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Employee'}
              </button>
            </form>
            <p className="mt-2 text-sm text-gray-600">All manager actions are logged for admin review.</p>
          </section>

          <section id="records" className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Emergency Records</h3>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or phone number"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm md:max-w-sm"
              />
            </div>

            {loading ? (
              <p className="text-sm text-gray-500">Loading records...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="py-3">Name</th>
                      <th className="py-3">Email</th>
                      <th className="py-3">Phone</th>
                      <th className="py-3">Blood Type</th>
                      <th className="py-3">Created</th>
                      <th className="py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record._id} className="border-b border-gray-100">
                        <td className="py-3 font-medium text-gray-900">{record.fullName}</td>
                        <td className="py-3 text-gray-700">{record.email || '—'}</td>
                        <td className="py-3 text-gray-700">{record.phoneNumber || '—'}</td>
                        <td className="py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${bloodTypeBadgeClass(record.bloodType)}`}>
                            {record.bloodType || '—'}
                          </span>
                        </td>
                        <td className="py-3 text-gray-600">{formatDate(record.createdAt)}</td>
                        <td className="py-3">
                          <button
                            className="rounded-md bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100"
                            onClick={() => handleOpen(record)}
                          >
                            Open Record
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!loading && filteredRecords.length === 0 && (
                  <p className="pt-4 text-sm text-gray-500">No records match your search.</p>
                )}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
