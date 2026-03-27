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

type BatchDownloadRow = {
  serialNumber: string;
  uuid: string;
  activationUrl: string;
  scanUrl?: string;
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
    const data = await fetchBatchDownloadData(batchId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incase-batch-${batchId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return data;
  };

  const fetchBatchDownloadData = async (batchId: string) => {
    const res = await fetch(`${backendApiBaseUrl}/api/v1/admin/qr/download/${encodeURIComponent(batchId)}`, {
      headers: authHeaders,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Download failed');
    return data as BatchDownloadRow[];
  };

  const downloadCsv = async (batchId: string) => {
    const rows = await downloadJson(batchId);
    const csv = [
      'Serial Number,UUID,Activation URL,Scan URL',
      ...rows.map((r) => `"${r.serialNumber}","${r.uuid}","${r.activationUrl}","${r.scanUrl || ''}"`),
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

  const downloadZip = async (batchId: string) => {
    const res = await fetch(`${backendApiBaseUrl}/api/v1/admin/qr/download-zip/${encodeURIComponent(batchId)}`, {
      headers: authHeaders,
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'ZIP download failed');
    }
    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition') || '';
    const nameMatch = disposition.match(/filename="?([^";]+)"?/i);
    const filename = nameMatch?.[1] || `INCASE-QR-${batchId}.zip`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printStickerSheet = async (batchId: string) => {
    const rows = await fetchBatchDownloadData(batchId);
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
    if (!printWindow) {
      throw new Error('Popup blocked. Please allow popups and try print again.');
    }

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>INcase Stickers - ${batchId}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 12px; }
      h1 { font-size: 16px; margin: 0 0 8px; }
      .meta { font-size: 12px; color: #555; margin-bottom: 12px; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
      .sticker { border: 1px solid #ddd; border-radius: 8px; padding: 8px; text-align: center; page-break-inside: avoid; }
      .brand { font-weight: 700; color: #f97316; font-size: 13px; }
      .serial { font-size: 12px; font-weight: 700; margin-top: 4px; }
      .uuid { font-size: 10px; color: #666; word-break: break-all; }
      .url { font-size: 10px; color: #0a66c2; word-break: break-all; }
      img { width: 130px; height: 130px; object-fit: contain; margin-top: 6px; }
      @media print { .no-print { display:none; } body { padding: 0; } }
    </style>
  </head>
  <body>
    <button class="no-print" onclick="window.print()">Print</button>
    <h1>INcase Sticker Batch: ${batchId}</h1>
    <div class="meta">Total stickers: ${rows.length}. Print this sheet and cut by sticker borders.</div>
    <div class="grid">
      ${rows
        .map(
          (r) => `<div class="sticker">
            <div class="brand">INcase Emergency Sticker</div>
            <div class="serial">${r.serialNumber}</div>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(r.scanUrl || r.activationUrl)}" alt="${r.serialNumber}" />
            <div class="uuid">${r.uuid}</div>
            <div class="url">${r.activationUrl}</div>
          </div>`
        )
        .join('')}
    </div>
  </body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const editBatch = async (batch: BatchRow) => {
    const nextType = (window.prompt('Type (b2c / b2b / b2g)', batch.type) || batch.type).toLowerCase();
    const nextOrganization = window.prompt('Organization Name', batch.organizationName || '') ?? batch.organizationName ?? '';
    const nextNotes = window.prompt('Notes', '') ?? '';

    const res = await fetch(`${backendApiBaseUrl}/api/v1/admin/qr/batch/${encodeURIComponent(batch.batchId)}`, {
      method: 'PATCH',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: nextType, organizationName: nextOrganization, notes: nextNotes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to edit batch');
    await fetchBatches();
    await fetchStats();
  };

  const deleteBatch = async (batch: BatchRow) => {
    const confirmed = window.confirm(`Delete batch ${batch.batchId}? This may delete all stickers in this batch.`);
    if (!confirmed) return;

    let url = `${backendApiBaseUrl}/api/v1/admin/qr/batch/${encodeURIComponent(batch.batchId)}`;
    let res = await fetch(url, { method: 'DELETE', headers: authHeaders });
    let data = await res.json();

    if (!res.ok && res.status === 409) {
      const force = window.confirm(`${data.error}\n\nActive stickers: ${data.activeCount}. Force delete?`);
      if (!force) return;
      url = `${url}?force=true`;
      res = await fetch(url, { method: 'DELETE', headers: authHeaders });
      data = await res.json();
    }

    if (!res.ok) throw new Error(data.error || 'Failed to delete batch');

    await fetchBatches();
    await fetchStats();
    await fetchStickers(1);
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

  const reactivateSticker = async (uuid: string) => {
    const confirmed = window.confirm('Reactivate this sticker? It will become usable again for a new user activation.');
    if (!confirmed) return;

    const res = await fetch(`${backendApiBaseUrl}/api/v1/admin/qr/reassign/${encodeURIComponent(uuid)}`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reactivate sticker');
    await fetchStats();
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
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            After generation, use these options:
            <div>1. Print Stickers: direct printable sticker sheet with QR images.</div>
            <div>2. CSV: send to sticker printing vendor.</div>
            <div>3. JSON: system integration / backup.</div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantity (max 500)</label>
              <input type="number" min={1} max={500} value={quantity} onChange={(e) => setQuantity(Number(e.target.value || 1))} className="mt-1 w-full rounded-lg border px-3 py-2" aria-label="Batch quantity" title="Batch quantity" placeholder="Enter quantity" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as 'b2c' | 'b2b' | 'b2g')} className="mt-1 w-full rounded-lg border px-3 py-2" aria-label="Batch type" title="Batch type">
                <option value="b2c">B2C</option>
                <option value="b2b">B2B</option>
                <option value="b2g">B2G</option>
              </select>
            </div>
          </div>

          {(type === 'b2b' || type === 'b2g') && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Organization Name</label>
              <input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" aria-label="Organization name" title="Organization name" placeholder="Organization name" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" rows={3} aria-label="Batch notes" title="Batch notes" placeholder="Optional notes" />
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
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await downloadZip(generateResult.batchId);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'ZIP download failed');
                    }
                  }}
                  className="ml-2 rounded-lg bg-green-700 px-3 py-2 text-white"
                  title="Download QR codes as PNG images in a ZIP file - ready to print and distribute"
                >
                  Download as ZIP (QR Images)
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await downloadCsv(generateResult.batchId);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Download failed');
                    }
                  }}
                  className="ml-2 rounded-lg bg-slate-700 px-3 py-2 text-white"
                >
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await printStickerSheet(generateResult.batchId);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Print failed');
                    }
                  }}
                  className="ml-2 rounded-lg bg-orange-600 px-3 py-2 text-white"
                >
                  Print Stickers
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
                <th className="px-3 py-2">Actions</th>
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
                      <button onClick={async () => { try { await downloadZip(b.batchId); } catch (err) { setError(err instanceof Error ? err.message : 'ZIP download failed'); } }} className="rounded bg-green-600 px-2 py-1 text-xs text-white" title="Download QR images as ZIP file for printing">ZIP</button>
                      <button onClick={async () => { try { await downloadJson(b.batchId); } catch (err) { setError(err instanceof Error ? err.message : 'Download failed'); } }} className="rounded bg-blue-600 px-2 py-1 text-xs text-white">JSON</button>
                      <button onClick={async () => { try { await downloadCsv(b.batchId); } catch (err) { setError(err instanceof Error ? err.message : 'Download failed'); } }} className="rounded bg-gray-700 px-2 py-1 text-xs text-white">CSV</button>
                      <button onClick={async () => { try { await printStickerSheet(b.batchId); } catch (err) { setError(err instanceof Error ? err.message : 'Print failed'); } }} className="rounded bg-orange-600 px-2 py-1 text-xs text-white">Print</button>
                      <button onClick={async () => { try { await editBatch(b); } catch (err) { setError(err instanceof Error ? err.message : 'Edit failed'); } }} className="rounded bg-amber-600 px-2 py-1 text-xs text-white">Edit</button>
                      <button onClick={async () => { try { await deleteBatch(b); } catch (err) { setError(err instanceof Error ? err.message : 'Delete failed'); } }} className="rounded bg-red-600 px-2 py-1 text-xs text-white">Delete</button>
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
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border px-3 py-2" aria-label="Status filter" title="Status filter">
              <option value="all">All Statuses</option>
              <option value="generated">Generated</option>
              <option value="distributed">Distributed</option>
              <option value="unactivated">Unactivated</option>
              <option value="active">Active</option>
              <option value="deactivated">Deactivated</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border px-3 py-2" aria-label="Type filter" title="Type filter">
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
                        {s.status === 'deactivated' ? (
                          <button onClick={async () => { try { await reactivateSticker(s.uuid); } catch (err) { setError(err instanceof Error ? err.message : 'Action failed'); } }} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white">Reactivate</button>
                        ) : (
                          <button onClick={async () => { try { await reassignSticker(s.uuid); } catch (err) { setError(err instanceof Error ? err.message : 'Action failed'); } }} className="rounded bg-amber-600 px-2 py-1 text-xs text-white">Reassign</button>
                        )}
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
