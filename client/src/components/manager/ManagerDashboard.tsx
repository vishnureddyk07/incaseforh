import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  BadgeCheck,
  Eye,
  FileClock,
  Mail,
  Phone,
  RefreshCcw,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react';

interface EmergencyInfo {
  _id: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  createdAt?: string;
  bloodType?: string;
}

export default function ManagerDashboard() {
  const RECORDS_PER_PAGE = 25;
  const { isAuthenticated, user, token } = useAuth();
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com';
  const [records, setRecords] = useState<EmergencyInfo[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
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
    fetch(`${apiBase}/api/v1/emergency?limit=1000`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load records');
        return res.json();
      })
      .then((data) => {
        const recordsArray = Array.isArray(data) ? data : Array.isArray(data?.records) ? data.records : [];
        setRecords(recordsArray);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    setCurrentPage(1);
  }, [records.length]);

  const sorted = useMemo(() => {
    return [...records].sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [records]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / RECORDS_PER_PAGE));
  const recordsThisWeek = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    return sorted.filter((record) => {
      if (!record.createdAt) return false;
      const createdAt = new Date(record.createdAt).getTime();
      return Number.isFinite(createdAt) && now - createdAt <= weekMs;
    }).length;
  }, [sorted]);
  const contactReadyCount = useMemo(() => {
    return sorted.filter((record) => Boolean(record.email || record.phoneNumber)).length;
  }, [sorted]);
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
    return sorted.slice(startIndex, startIndex + RECORDS_PER_PAGE);
  }, [sorted, currentPage]);

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
    <div className="min-h-screen section gradient-primary">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="card-elevated p-6 md:p-8 border border-primary-100">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold mb-3">
                <ShieldCheck className="h-4 w-4" />
                Manager Control Center
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-neutral-900">Manager Dashboard</h1>
              <p className="text-sm md:text-base text-neutral-600 mt-2">
                Monitor emergency profile records and provision employee accounts securely.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
            <Link to="/" className="btn-secondary-md">Home</Link>
            <button
              onClick={() => {
                setCurrentPage(1);
                fetchRecords();
              }}
              className="btn-secondary-md"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-elevated p-5 border border-primary-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">Total Records</p>
                <p className="text-2xl font-bold text-neutral-900 mt-1">{loading ? '...' : records.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary-100 text-primary-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="card-elevated p-5 border border-primary-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">New This Week</p>
                <p className="text-2xl font-bold text-neutral-900 mt-1">{loading ? '...' : recordsThisWeek}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary-100 text-primary-600">
                <FileClock className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="card-elevated p-5 border border-primary-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">Contact Ready</p>
                <p className="text-2xl font-bold text-neutral-900 mt-1">{loading ? '...' : contactReadyCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary-100 text-primary-600">
                <BadgeCheck className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="card-elevated p-5 border border-primary-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">Current Page</p>
                <p className="text-2xl font-bold text-neutral-900 mt-1">{currentPage}/{totalPages}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary-100 text-primary-600">
                <UserCog className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        <div className="card-elevated p-6 border border-primary-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-neutral-900">
            <UserCog className="h-5 w-5 text-primary-600" />
            Create Employee Credentials
          </h2>
          <form onSubmit={createEmployee} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="label flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary-600" />
                Employee Email
              </label>
              <input value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} className="input" placeholder="employee@example.com" />
            </div>
            <div>
              <label className="label flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary-600" />
                Temporary Password
              </label>
              <input value={empPassword} onChange={(e) => setEmpPassword(e.target.value)} className="input" placeholder="min 6 chars" />
            </div>
            <button disabled={creating} className="btn-primary-md disabled:opacity-50">{creating ? 'Creating…' : 'Create'}</button>
          </form>
          <p className="mt-2 text-sm text-neutral-600">All manager actions are logged for admin review.</p>
        </div>

        <div className="card-elevated p-6 border border-primary-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-neutral-900">
            <Eye className="h-5 w-5 text-primary-600" />
            Emergency Records (view-only)
          </h2>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          {loading ? (
            <p className="text-neutral-600">Loading...</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-neutral-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-100">
                  <tr className="text-neutral-700">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Blood Type</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {paginatedRecords.map((r) => (
                    <tr key={r._id} className="border-t border-neutral-100 hover:bg-primary-50/40 transition-colors">
                      <td className="py-3 px-4 font-medium text-neutral-900">{r.fullName}</td>
                      <td className="py-3 px-4 text-neutral-700">{r.email || '—'}</td>
                      <td className="py-3 px-4 text-neutral-700">{r.phoneNumber || '—'}</td>
                      <td className="py-3 px-4 text-neutral-700">{r.bloodType || '—'}</td>
                      <td className="py-3 px-4 text-neutral-700">{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
                      <td className="py-3 px-4">
                        <button className="inline-flex items-center gap-1 text-primary-700 font-medium hover:text-primary-900" onClick={() => handleOpen(r)}>
                          <Eye className="h-4 w-4" />
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && sorted.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-neutral-600">
                Showing {(currentPage - 1) * RECORDS_PER_PAGE + 1}-
                {Math.min(currentPage * RECORDS_PER_PAGE, sorted.length)} of {sorted.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-neutral-700">Page {currentPage} of {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
