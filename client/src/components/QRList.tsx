import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import * as QRCodeLib from 'qrcode';
import { useAuth } from "../context/AuthContext";

interface EmergencyInfo {
  _id: string;
  fullName: string;
  email?: string;
  qrCode?: string;
  hasPhoto?: boolean;
  bloodType?: string;
  emergencyContact?: string;
  allergies?: string;
  medications?: string;
  medicalConditions?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  address?: string;
  alternateNumber1?: string;
  alternateNumber2?: string;
  createdAt?: string;
}

export default function QRList() {
  const [qrs, setQrs] = useState<EmergencyInfo[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [editingRecord, setEditingRecord] = useState<EmergencyInfo | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const { isAuthenticated, token, user } = useAuth();
  const navigate = useNavigate();

  const API_BASE = import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com';

  useEffect(() => {
    const fetchQrs = async () => {
      if (!isAuthenticated || !token || user?.role !== 'admin') {
        setLoading(false);
        setError('Admin login required to view QR list.');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/v1/emergency?view=list`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const text = await res.text();
          const message = res.status === 401 || res.status === 403
            ? 'You are not authorized to view QR codes. Please log in as an admin.'
            : text || 'Failed to fetch QR list';
          throw new Error(message);
        }

        const data = await res.json();
        setQrs(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to fetch QR list');
        setLoading(false);
      }
    };

    fetchQrs();
  }, [API_BASE, isAuthenticated, token, user?.role]);

  const handleOpen = (record: EmergencyInfo) => {
    const identifier = (record.email && record.email.trim()) || (record.phoneNumber && record.phoneNumber.trim());
    if (!identifier) {
      alert('No email or phone number available for this record');
      return;
    }
    navigate(`/emergencyinfo/${encodeURIComponent(identifier)}`);
  };

  // Search and filter as derived value (no extra render cycle)
  const filteredQrs = useMemo(() => {
    let filtered = [...qrs];

    if (searchTerm) {
      const needle = searchTerm.toLowerCase();
      filtered = filtered.filter(q =>
        q.fullName.toLowerCase().includes(needle) ||
        (q.email || '').toLowerCase().includes(needle) ||
        (q.phoneNumber || '').toLowerCase().includes(needle)
      );
    }

    if (sortBy === 'newest') {
      filtered.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.fullName.localeCompare(b.fullName));
    }

    return filtered;
  }, [qrs, searchTerm, sortBy]);

  const filteredMap = useMemo(() => {
    const map = new Map<string, EmergencyInfo>();
    filteredQrs.forEach((r) => map.set(r._id, r));
    return map;
  }, [filteredQrs]);

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(filteredQrs.map((r) => r._id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const dataUrlToBlob = (dataUrl: string): Blob => {
    if (!dataUrl) throw new Error('Invalid data URL: empty or null');
    
    const trimmed = dataUrl.trim();
    console.log('dataUrlToBlob input length:', trimmed.length);
    console.log('dataUrlToBlob first 100 chars:', trimmed.substring(0, 100));
    
    try {
      // Check if it's actually a data URL
      if (!trimmed.startsWith('data:')) {
        throw new Error(`Not a data URL. Starts with: "${trimmed.substring(0, 50)}"`);
      }
      
      // Find the comma separator
      const commaIndex = trimmed.indexOf(',');
      if (commaIndex === -1) {
        throw new Error('Data URL missing comma separator');
      }
      
      const header = trimmed.substring(0, commaIndex);
      const data = trimmed.substring(commaIndex + 1);
      
      if (!data) {
        throw new Error('Data URL has empty data portion');
      }
      
      // Decode base64
      let bstr;
      try {
        bstr = atob(data);
      } catch (e) {
        throw new Error(`Invalid base64 encoding: ${(e as Error).message}`);
      }
      
      const n = bstr.length;
      const u8arr = new Uint8Array(n);
      
      for (let i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i);
      }
      
      const mimeMatch = header.match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      
      console.log('Successfully converted to blob. Size:', u8arr.length, 'MIME:', mimeType);
      return new Blob([u8arr], { type: mimeType });
    } catch (err) {
      console.error('dataUrlToBlob error details:', {
        inputLength: trimmed.length,
        firstChars: trimmed.substring(0, 100),
        error: (err as Error).message,
      });
      throw err;
    }
  };

  const resolvePublicAppBase = () => {
    const configuredPublicBase = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
    if (configuredPublicBase && /^https?:\/\//i.test(configuredPublicBase)) {
      return configuredPublicBase.replace(/\/+$/, '');
    }
    // Use public production URL to keep QR scans accessible without deployment auth.
    return 'https://incaseforh.vercel.app';
  };

  const buildEmergencyPageUrl = (record: EmergencyInfo) => {
    const identifier = (record.email && record.email.trim()) || (record.phoneNumber && record.phoneNumber.trim());
    if (!identifier) return null;
    return `${resolvePublicAppBase()}/emergencyinfo/${encodeURIComponent(identifier)}`;
  };

  const generateFreshQrDataUrl = async (record: EmergencyInfo): Promise<string | null> => {
    const pageUrl = buildEmergencyPageUrl(record);
    if (!pageUrl) return null;
    return QRCodeLib.toDataURL(pageUrl, {
      width: 300,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  };

  const fetchRecordForDownload = async (record: EmergencyInfo): Promise<EmergencyInfo> => {
    if (record.qrCode) return record;
    const identifier = (record.email && record.email.trim()) || (record.phoneNumber && record.phoneNumber.trim());
    if (!identifier) throw new Error('No email or phone number available for download');
    const isEmail = identifier.includes('@');
    const endpoint = isEmail
      ? `${API_BASE}/api/v1/emergency/${encodeURIComponent(identifier)}`
      : `${API_BASE}/api/v1/emergency/phone/${encodeURIComponent(identifier)}`;
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error('Failed to fetch QR code for this record');
    const fullRecord = await res.json();
    return fullRecord;
  };

  const downloadSingle = async (record: EmergencyInfo) => {
    try {
      const freshQrCode = await generateFreshQrDataUrl(record);
      let qrToDownload = freshQrCode;
      if (!qrToDownload) {
        const targetRecord = await fetchRecordForDownload(record);
        qrToDownload = targetRecord.qrCode || null;
      }
      if (!qrToDownload) {
        throw new Error('QR code not available for this record');
      }
      const blob = dataUrlToBlob(qrToDownload);
      const filename = `${(record.fullName || 'qr-code').replace(/[^a-z0-9\-_. ]/gi, '_')}.png`;
      saveAs(blob, filename);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download QR code. Data may be corrupted.');
    }
  };

  const downloadSelected = async () => {
    if (selectedIds.size === 0) {
      alert('Select at least one record');
      return;
    }
    setDownloading(true);
    try {
      if (selectedIds.size === 1) {
        const onlyId = Array.from(selectedIds)[0];
        const rec = filteredMap.get(onlyId);
        if (!rec) throw new Error('Record missing');
        await downloadSingle(rec);
        return;
      }

      const zip = new JSZip();
      let successCount = 0;
      let failCount = 0;

      for (const id of selectedIds) {
        const rec = filteredMap.get(id);
        if (!rec) {
          failCount++;
          continue;
        }
        try {
          let qrToDownload = await generateFreshQrDataUrl(rec);
          if (!qrToDownload) {
            const targetRecord = await fetchRecordForDownload(rec);
            qrToDownload = targetRecord.qrCode || null;
            if (!qrToDownload) {
              failCount++;
              continue;
            }
          }
          const blob = dataUrlToBlob(qrToDownload);
          const name = (rec.fullName || 'qr-code').replace(/[^a-z0-9\-_. ]/gi, '_');
          zip.file(`${name}.png`, blob);
          successCount++;
        } catch (err) {
          console.error(`Failed to add ${rec.fullName} to zip:`, err);
          failCount++;
        }
      }

      if (successCount === 0) {
        alert('No valid QR codes to download.');
        setDownloading(false);
        return;
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `emergency-qrs-${successCount}.zip`);
      if (failCount > 0) {
        alert(`Downloaded ${successCount} QR codes (${failCount} failed due to corruption).`);
      }
    } catch (err) {
      console.error('Bulk download error:', err);
      alert('Failed to download selected QR codes.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async (record: EmergencyInfo) => {
    if (!token) return;
    const confirmed = window.confirm(`Delete record for ${record.fullName}? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/emergency/${record._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to delete record');
      }
      setQrs((prev) => prev.filter((r) => r._id !== record._id));
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to delete record');
    }
  };

  const handleEdit = (e: React.MouseEvent, record: EmergencyInfo) => {
    e.stopPropagation();
    setEditingRecord(record);
  };

  const handleSaveEdit = async (updatedData: Partial<EmergencyInfo>) => {
    if (!editingRecord || !token) return;
    try {
      const identifier = (editingRecord.email && editingRecord.email.trim()) || (editingRecord.phoneNumber && editingRecord.phoneNumber.trim());
      if (!identifier) {
        alert('No email or phone number available for update');
        return;
      }
      const isEmail = identifier.includes('@');
      const url = isEmail
        ? `${API_BASE}/api/v1/emergency/${identifier}`
        : `${API_BASE}/api/v1/emergency/phone/${identifier}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error('Failed to update');
      // Refresh list
      const listRes = await fetch(`${API_BASE}/api/v1/emergency?view=list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await listRes.json();
      setQrs(data);
      setEditingRecord(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update record');
    }
  };

  if (!isAuthenticated || !token || user?.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Admin Access Required</h2>
        <p className="text-gray-700">Please sign in as an admin at /admin to view all QR codes.</p>
      </div>
    );
  }

  if (loading) return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-36 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="bg-white p-4 rounded-lg shadow mb-6 space-y-3">
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow">
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded bg-gray-200 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  if (error) return <div className="max-w-2xl mx-auto p-6 text-red-600">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Emergency Records</h2>
        <Link 
          to="/change-password" 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Change Password
        </Link>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 space-y-3">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-md"
        />
        <div className="flex gap-3 items-center">
          <label htmlFor="qr-sort" className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
            id="qr-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 border rounded-md"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name (A-Z)</option>
          </select>
          <span className="ml-auto text-sm text-gray-600">{filteredQrs.length} record(s)</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleSelectionMode}
              className="px-3 py-1 border rounded hover:bg-gray-100"
            >
              {selectionMode ? 'Close download mode' : 'Download'}
            </button>
            {selectionMode && (
              <>
                <button
                  type="button"
                  onClick={selectAllVisible}
                  className="px-3 py-1 border rounded hover:bg-gray-100"
                >
                  Select visible
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="px-3 py-1 border rounded hover:bg-gray-100"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={downloadSelected}
                  disabled={downloading}
                  className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-60"
                >
                  {downloading ? 'Preparing...' : `Download (${selectedIds.size || 0})`}
                </button>
              </>
            )}
          </div>
        </div>
        {selectionMode && <p className="text-xs text-gray-500">Tip: toggle cards to include them; multiple selections will download as a zip, single selection as a PNG.</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredQrs.map((qr) => (
          <div key={qr._id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition">
            <div className="flex gap-4 cursor-pointer" onClick={() => handleOpen(qr)}>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{qr.fullName}</h3>
                <p className="text-sm text-gray-600">{qr.email || 'Email not provided'}</p>
                <p className="text-sm text-gray-700">{qr.phoneNumber || 'Phone not provided'}</p>
                {qr.hasPhoto && (
                  <span className="mt-1 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Photo available
                  </span>
                )}
                {(qr.alternateNumber1 || qr.alternateNumber2) && (
                  <p className="text-xs text-gray-500">
                    Alt: {[qr.alternateNumber1, qr.alternateNumber2].filter(Boolean).join(' | ')}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {qr.createdAt ? new Date(qr.createdAt).toLocaleDateString() : 'N/A'} {qr.createdAt ? new Date(qr.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                </p>
              </div>
              {selectionMode && (
                <input
                  aria-label={`Select ${qr.fullName}`}
                  type="checkbox"
                  checked={selectedIds.has(qr._id)}
                  onChange={() => toggleSelect(qr._id)}
                  className="w-5 h-5 mt-1"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={(e) => handleEdit(e, qr)}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
              >
                Edit Info
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); downloadSingle(qr); }}
                className="text-sm bg-orange-100 hover:bg-orange-200 px-3 py-1 rounded"
              >
                Download QR
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(qr); }}
                className="text-sm bg-red-100 hover:bg-red-200 px-3 py-1 rounded text-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingRecord && (
        <EditRecordModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}

// Edit Modal Component
function EditRecordModal({ record, onClose, onSave }: {
  record: EmergencyInfo;
  onClose: () => void;
  onSave: (data: Partial<EmergencyInfo>) => void;
}) {
  const [formData, setFormData] = useState({
    fullName: record.fullName || '',
    email: record.email || '',
    bloodType: record.bloodType || '',
    emergencyContact: record.emergencyContact || '',
    allergies: record.allergies || '',
    medications: record.medications || '',
    medicalConditions: record.medicalConditions || '',
    dateOfBirth: record.dateOfBirth || '',
    phoneNumber: record.phoneNumber || '',
    alternateNumber1: record.alternateNumber1 || '',
    alternateNumber2: record.alternateNumber2 || '',
    address: record.address || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Edit Record</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>
        <p className="text-sm text-yellow-600 mb-4">⚠️ QR code will remain unchanged</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-full-name" className="block text-sm font-medium">Full Name</label>
            <input id="edit-full-name" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label htmlFor="edit-email" className="block text-sm font-medium">Email (optional)</label>
            <input id="edit-email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" type="email" />
          </div>
          <div>
            <label htmlFor="edit-blood-type" className="block text-sm font-medium">Blood Type</label>
            <input id="edit-blood-type" value={formData.bloodType} onChange={(e) => setFormData({...formData, bloodType: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label htmlFor="edit-emergency-contact" className="block text-sm font-medium">Emergency Contact</label>
            <input id="edit-emergency-contact" value={formData.emergencyContact} onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label htmlFor="edit-phone" className="block text-sm font-medium">Phone Number</label>
            <input id="edit-phone" value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-alt-1" className="block text-sm font-medium">Alternate Number 1</label>
              <input id="edit-alt-1" value={formData.alternateNumber1} onChange={(e) => setFormData({...formData, alternateNumber1: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label htmlFor="edit-alt-2" className="block text-sm font-medium">Alternate Number 2</label>
              <input id="edit-alt-2" value={formData.alternateNumber2} onChange={(e) => setFormData({...formData, alternateNumber2: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" />
            </div>
          </div>
          <div>
            <label htmlFor="edit-dob" className="block text-sm font-medium">Date of Birth</label>
            <input id="edit-dob" type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label htmlFor="edit-address" className="block text-sm font-medium">Address</label>
            <input id="edit-address" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label htmlFor="edit-allergies" className="block text-sm font-medium">Allergies</label>
            <textarea id="edit-allergies" value={formData.allergies} onChange={(e) => setFormData({...formData, allergies: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" rows={2} />
          </div>
          <div>
            <label htmlFor="edit-medications" className="block text-sm font-medium">Medications</label>
            <textarea id="edit-medications" value={formData.medications} onChange={(e) => setFormData({...formData, medications: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" rows={2} />
          </div>
          <div>
            <label htmlFor="edit-medical-conditions" className="block text-sm font-medium">Medical Conditions</label>
            <textarea id="edit-medical-conditions" value={formData.medicalConditions} onChange={(e) => setFormData({...formData, medicalConditions: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" rows={2} />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}