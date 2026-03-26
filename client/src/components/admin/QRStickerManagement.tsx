import { useEffect, useMemo, useState } from 'react';

type TabKey = 'overview' | 'generate' | 'batches' | 'stickers';

type QrStats = {
  totalGenerated: number;
  totalActive: number;
  totalUnactivated: number;
  totalDeactivated: number;
  byType: { b2c: number; b2b: number; b2g: number };
  recentActivations: Array<{
    _id: string;
    serialNumber: string;
    activatedAt?: string;
    activatedBy?: { fullName?: string; email?: string; phoneNumber?: string };
  }>;
};

type BatchRow = {
  _id: string;
  batchId: string;
  createdAt: string;
  quantity: number;
  type: 'b2c' | 'b2b' | 'b2g';
  organizationName?: string;
  activeCount?: number;
  unactivatedCount?: number;
};

type StickerRow = {
  _id: string;
  uuid: string;
  serialNumber: string;
  status: 'generated' | 'distributed' | 'unactivated' | 'active' | 'deactivated';
  type: 'b2c' | 'b2b' | 'b2g';
  activatedAt?: string;
  lastScannedAt?: string;
  activatedBy?: { fullName?: string; email?: string; phoneNumber?: string };
};

interface Props {
  token: string | null;
  backendApiBaseUrl: string;
}

export default function QRStickerManagement({ token, backendApiBaseUrl }: Props) {
  const [tab, setTab] = useState<TabKey>('overview');
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<QrStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const [quantity, setQuantity] = useState(50);
  const [type, setType] = useState<'b2c' | 'b2b' | 'b2g'>('b2c');
  const [organizationName, setOrganizationName] = useState('');
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<{ batchId: string; quantity: number } | null>(null);

  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  const [stickers, setStickers] = useState<StickerRow[]>([]);
  const [loadingStickers, setLoadingStickers] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStickers, setTotalStickers] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token || ''}` }), [token]);

  const fetchStats = async () => {
    if (!token) return;
    setLoadingStats(true);
    try {
      const res = await fetch(`${backendApiBaseUrl}/api/v1/admin/qr/stats`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch stats');
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchBatches = async () => {
    if (!token) return;
    setLoadingBatches(true);
    try {
      const res = await fetch(`${backendApiBaseUrl}/api/v1/admin/qr/batches`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch batches');
      setBatches(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch batches');
    } finally {
      setLoadingBatches(false);
    }
  };

  const fetchStickers = async (targetPage = page) => {
    if (!token) return;
    setLoadingStickers(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: '50',
        status: statusFilter,
        type: typeFilter,
        search,
      });
      const res = await fetch(`${backendApiBaseUrl}/api/v1/admin/qr/stickers?${params.toString()}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch stickers');
      setStickers(Array.isArray(data.items) ? data.items : []);
      setTotalPages(data.totalPages || 1);
      setTotalStickers(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stickers');
    } finally {
      setLoadingStickers(false);
    }
  };

  useEffect(() => {
    void fetchStats();
    void fetchBatches();
    void fetchStickers(1);
  }, [token]);

  useEffect(() => {
    setPage(1);
    void fetchStickers(1);
  }, [statusFilter, typeFilter]);

  const generateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setGenerating(true);
    setError(null);
    setGenerateResult(null);
    try {
      const res = await fetch(`${backendApiBaseUrl}/api/v1/admin/qr/generate`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, type, organizationName, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      setGenerateResult({ batchId: data.batchId, quantity: data.quantity });
      await fetchStats();
      await fetchBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  const downloadJson = async (batchId: string) => {
    const res = await fetch(`${backendApiBaseUrl}/api/v1/admin/qr/download/${encodeURIComponent(batchId)}`, {
      headers: authHeaders,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Download failed');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incase-batch-${batchId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return data as Array<{ serialNumber: string; uuid: string; activationUrl: string }>;
  };

  const downloadCsv = async (batchId: string) => {
    const rows = await downloadJson(batchId);
    const csv = [
      'Serial Number,UUID,Activation URL',
      ...rows.map((r) => `"${r.serialNumber}","${r.uuid}","${r.activationUrl}"`),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incase-batch-${batchId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deactivateSticker = async (uuid: string) => {
    const reason = window.prompt('Deactivation reason', 'Deactivated by admin') || 'Deactivated by admin';
    const res = await fetch(`${backendApiBaseUrl}/api/v1/admin/qr/deactivate/${encodeURIComponent(uuid)}`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ deactivatedReason: reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to deactivate sticker');
    await fetchStats();
    await fetchStickers(page);
  };

  const reassignSticker = async (uuid: string) => {
    const name = window.prompt('Assign to name (optional)', '') || '';
    const email = window.prompt('Assign to email (optional)', '') || '';
    const phone = window.prompt('Assign to phone (optional)', '') || '';
    const org = window.prompt('Organization name (optional)', '') || '';

    const res = await fetch(`${backendApiBaseUrl}/api/v1/admin/qr/reassign/${encodeURIComponent(uuid)}`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, organizationName: org }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reassign sticker');
    await fetchStickers(page);
  };

  const statusBadge = (status: StickerRow['status']) => {
    if (status === 'active') return 'bg-green-100 text-green-700';
    if (status === 'deactivated') return 'bg-red-100 text-red-700';
    if (status === 'unactivated' || status === 'distributed') return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  const typeBadge = (value: StickerRow['type']) => {
    if (value === 'b2b') return 'bg-blue-100 text-blue-700';
    if (value === 'b2g') return 'bg-purple-100 text-purple-700';
    return 'bg-orange-100 text-orange-700';
  };

  return (
    <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm" id="qr-management">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">QR Sticker Management</h3>
        <div className="flex gap-2 text-sm">
          {(['overview', 'generate', 'batches', 'stickers'] as TabKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-lg px-3 py-1.5 capitalize ${tab === k ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              {k === 'stickers' ? 'All Stickers' : k}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      {tab === 'overview' && (
        <div className="space-y-4">
          {loadingStats ? <p className="text-sm text-gray-500">Loading stats...</p> : null}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border bg-gray-50 p-4"><p className="text-xs text-gray-500">Total Generated</p><p className="text-2xl font-bold">{stats?.totalGenerated ?? 0}</p></div>
            <div className="rounded-xl border bg-green-50 p-4"><p className="text-xs text-gray-500">Total Active</p><p className="text-2xl font-bold text-green-700">{stats?.totalActive ?? 0}</p></div>
            <div className="rounded-xl border bg-yellow-50 p-4"><p className="text-xs text-gray-500">Total Unactivated</p><p className="text-2xl font-bold text-yellow-700">{stats?.totalUnactivated ?? 0}</p></div>
            <div className="rounded-xl border bg-red-50 p-4"><p className="text-xs text-gray-500">Total Deactivated</p><p className="text-2xl font-bold text-red-700">{stats?.totalDeactivated ?? 0}</p></div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-orange-50 p-4"><p className="text-xs text-gray-500">B2C</p><p className="text-xl font-bold text-orange-700">{stats?.byType?.b2c ?? 0}</p></div>
            <div className="rounded-xl border bg-blue-50 p-4"><p className="text-xs text-gray-500">B2B</p><p className="text-xl font-bold text-blue-700">{stats?.byType?.b2b ?? 0}</p></div>
            <div className="rounded-xl border bg-purple-50 p-4"><p className="text-xs text-gray-500">B2G</p><p className="text-xl font-bold text-purple-700">{stats?.byType?.b2g ?? 0}</p></div>
          </div>

          <div className="rounded-xl border p-4">
            <p className="mb-2 text-sm font-semibold text-gray-700">Recent Activations (last 10)</p>
            <div className="space-y-2">
              {(stats?.recentActivations || []).map((x) => (
                <div key={x._id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <span>{x.serialNumber} - {x.activatedBy?.fullName || 'Unknown'}</span>
                  <span className="text-xs text-gray-500">{x.activatedAt ? new Date(x.activatedAt).toLocaleString() : '—'}</span>
                </div>
              ))}
              {(!stats?.recentActivations || stats.recentActivations.length === 0) ? <p className="text-sm text-gray-500">No activations yet.</p> : null}
            </div>
          </div>
        </div>
      )}

      {tab === 'generate' && (
        <form onSubmit={generateBatch} className="space-y-4 rounded-xl border p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantity (max 500)</label>
              <input type="number" min={1} max={500} value={quantity} onChange={(e) => setQuantity(Number(e.target.value || 1))} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as 'b2c' | 'b2b' | 'b2g')} className="mt-1 w-full rounded-lg border px-3 py-2">
                <option value="b2c">B2C</option>
                <option value="b2b">B2B</option>
                <option value="b2g">B2G</option>
              </select>
            </div>
          </div>

          {(type === 'b2b' || type === 'b2g') && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Organization Name</label>
              <input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" rows={3} />
          </div>

          <button disabled={generating} className="w-full rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
            {generating ? 'Generating...' : 'Generate QR Batch'}
          </button>

          {generateResult ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              Batch generated successfully: <strong>{generateResult.batchId}</strong> ({generateResult.quantity} stickers)
              <div className="mt-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await downloadJson(generateResult.batchId);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Download failed');
                    }
                  }}
                  className="rounded-lg bg-green-600 px-3 py-2 text-white"
                >
                  Download Batch JSON
                </button>
              </div>
            </div>
          ) : null}
        </form>
      )}

      {tab === 'batches' && (
        <div className="overflow-x-auto rounded-xl border">
          {loadingBatches ? <p className="p-4 text-sm text-gray-500">Loading batches...</p> : null}
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-2">Batch ID</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Quantity</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Organization</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2">Unactivated</th>
                <th className="px-3 py-2">Downloads</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b._id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{b.batchId}</td>
                  <td className="px-3 py-2">{new Date(b.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{b.quantity}</td>
                  <td className="px-3 py-2 uppercase">{b.type}</td>
                  <td className="px-3 py-2">{b.organizationName || '—'}</td>
                  <td className="px-3 py-2">{b.activeCount ?? 0}</td>
                  <td className="px-3 py-2">{b.unactivatedCount ?? 0}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button onClick={async () => { try { await downloadJson(b.batchId); } catch (err) { setError(err instanceof Error ? err.message : 'Download failed'); } }} className="rounded bg-blue-600 px-2 py-1 text-xs text-white">JSON</button>
                      <button onClick={async () => { try { await downloadCsv(b.batchId); } catch (err) { setError(err instanceof Error ? err.message : 'Download failed'); } }} className="rounded bg-gray-700 px-2 py-1 text-xs text-white">CSV</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loadingBatches && batches.length === 0 ? (
                <tr><td className="px-3 py-4 text-sm text-gray-500" colSpan={8}>No batches found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'stickers' && (
        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-4">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search serial/UUID..." className="rounded-lg border px-3 py-2" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border px-3 py-2">
              <option value="all">All Statuses</option>
              <option value="generated">Generated</option>
              <option value="distributed">Distributed</option>
              <option value="unactivated">Unactivated</option>
              <option value="active">Active</option>
              <option value="deactivated">Deactivated</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border px-3 py-2">
              <option value="all">All Types</option>
              <option value="b2c">B2C</option>
              <option value="b2b">B2B</option>
              <option value="b2g">B2G</option>
            </select>
            <button onClick={() => void fetchStickers(1)} className="rounded-lg bg-gray-800 px-3 py-2 text-white">Apply</button>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            {loadingStickers ? <p className="p-4 text-sm text-gray-500">Loading stickers...</p> : null}
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-3 py-2">Serial</th>
                  <th className="px-3 py-2">UUID</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Activated Person</th>
                  <th className="px-3 py-2">Last Scanned</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stickers.map((s) => (
                  <tr key={s._id} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{s.serialNumber}</td>
                    <td className="px-3 py-2 font-mono text-xs">{s.uuid.slice(0, 8)}...{s.uuid.slice(-6)}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadge(s.status)}`}>{s.status}</span></td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${typeBadge(s.type)}`}>{s.type.toUpperCase()}</span></td>
                    <td className="px-3 py-2 text-xs">{s.activatedBy?.fullName || '—'}</td>
                    <td className="px-3 py-2 text-xs">{s.lastScannedAt ? new Date(s.lastScannedAt).toLocaleString() : '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button onClick={async () => { try { await deactivateSticker(s.uuid); } catch (err) { setError(err instanceof Error ? err.message : 'Action failed'); } }} className="rounded bg-red-600 px-2 py-1 text-xs text-white">Deactivate</button>
                        <button onClick={async () => { try { await reassignSticker(s.uuid); } catch (err) { setError(err instanceof Error ? err.message : 'Action failed'); } }} className="rounded bg-amber-600 px-2 py-1 text-xs text-white">Reassign</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loadingStickers && stickers.length === 0 ? (
                  <tr><td className="px-3 py-4 text-sm text-gray-500" colSpan={7}>No stickers found.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>Total: {totalStickers}</p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => {
                  const p = page - 1;
                  setPage(p);
                  void fetchStickers(p);
                }}
                className="rounded border px-2 py-1 disabled:opacity-50"
              >
                Prev
              </button>
              <span>Page {page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => {
                  const p = page + 1;
                  setPage(p);
                  void fetchStickers(p);
                }}
                className="rounded border px-2 py-1 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
