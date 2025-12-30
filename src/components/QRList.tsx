import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useAuth } from "../context/AuthContext";

interface EmergencyInfo {
  _id: string;
  fullName: string;
  email?: string;
  qrCode: string;
  photo?: string;
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
  const [filteredQrs, setFilteredQrs] = useState<EmergencyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [editingRecord, setEditingRecord] = useState<EmergencyInfo | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());
  const { isAuthenticated, token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !token || user?.role !== 'admin') {
      setLoading(false);
      return;
    }

    fetch('https://incaseforh.onrender.com/api/emergency', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch QR list');
        return res.json();
      })
      .then(data => {
        setQrs(data);
        setFilteredQrs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [isAuthenticated, token, user]);

  // Resolve authenticated photo URLs into stable object URLs (or keep data URLs)
  useEffect(() => {
    let isActive = true;
    const aborters: AbortController[] = [];

    const resolveSrc = (src: string): string => {
      const trimmed = src.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
        return trimmed;
      }
      // Treat as backend-relative path - use env var or production default
      const base = import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com';
      return trimmed.startsWith('/') ? `${base}${trimmed}` : `${base}/${trimmed}`;
    };

    const resolvePhotos = async () => {
      if (!isAuthenticated || !token) return;
      const nextMap = new Map<string, string>();

      for (const rec of qrs) {
        if (!rec.photo) continue;
        const src = rec.photo.trim();
        const id = rec._id;

        // Skip if already resolved
        const resolved = resolveSrc(src);

        // Data URL: use as-is
        if (resolved.startsWith('data:')) {
          nextMap.set(id, resolved);
          continue;
        }

        // Otherwise, fetch with auth and create object URL
        try {
          const controller = new AbortController();
          aborters.push(controller);
          const res = await fetch(resolved, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          if (!res.ok) throw new Error(`Photo fetch failed (${res.status})`);
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          nextMap.set(id, url);
        } catch (e) {
          console.warn('Photo resolve error for', id, e);
        }
      }

      if (isActive) setPhotoUrls(nextMap);
    };

    resolvePhotos();

    return () => {
      isActive = false;
      aborters.forEach((c) => c.abort());
      // Note: do not revoke object URLs here to preserve image visibility across re-opens.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrs, isAuthenticated, token]);

  const handleOpen = (record: EmergencyInfo) => {
    const identifier = (record.email && record.email.trim()) || (record.phoneNumber && record.phoneNumber.trim());
    if (!identifier) {
      alert('No email or phone number available for this record');
      return;
    }
    navigate(`/emergencyinfo/${encodeURIComponent(identifier)}`);
  };

  // Search and filter logic
  useEffect(() => {
    let filtered = [...qrs];

    // Apply search
    if (searchTerm) {
      const needle = searchTerm.toLowerCase();
      filtered = filtered.filter(q => 
        q.fullName.toLowerCase().includes(needle) ||
        (q.email || '').toLowerCase().includes(needle) ||
        (q.phoneNumber || '').toLowerCase().includes(needle)
      );
    }

    // Apply sort
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

    setFilteredQrs(filtered);
  }, [searchTerm, sortBy, qrs]);

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

  const downloadSingle = async (record: EmergencyInfo) => {
    if (!record.qrCode) {
      alert('QR code not available for this record');
      return;
    }
    try {
      const blob = dataUrlToBlob(record.qrCode);
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
        if (!rec || !rec.qrCode) {
          failCount++;
          continue;
        }
        try {
          const blob = dataUrlToBlob(rec.qrCode);
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
        ? `https://incaseforh.onrender.com/api/emergency/${identifier}`
        : `https://incaseforh.onrender.com/api/emergency/phone/${identifier}`;
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
      const listRes = await fetch('https://incaseforh.onrender.com/api/emergency', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await listRes.json();
      setQrs(data);
      setFilteredQrs(data);
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

  if (loading) return <div>Loading...</div>;
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
          <label className="text-sm font-medium text-gray-700">Sort by:</label>
          <select
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
              {qr.photo ? (
                <img src={photoUrls.get(qr._id) || qr.photo} alt={qr.fullName} className="w-20 h-20 rounded object-cover border" />
              ) : (
                <div className="w-20 h-20 rounded bg-gray-100 grid place-items-center text-gray-500 text-xs">No Photo</div>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{qr.fullName}</h3>
                <p className="text-sm text-gray-600">{qr.email || 'Email not provided'}</p>
                <p className="text-sm text-gray-700">{qr.phoneNumber || 'Phone not provided'}</p>
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
            <label className="block text-sm font-medium">Full Name</label>
            <input value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium">Email (optional)</label>
            <input value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" type="email" />
          </div>
          <div>
            <label className="block text-sm font-medium">Blood Type</label>
            <input value={formData.bloodType} onChange={(e) => setFormData({...formData, bloodType: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">Emergency Contact</label>
            <input value={formData.emergencyContact} onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">Phone Number</label>
            <input value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Alternate Number 1</label>
              <input value={formData.alternateNumber1} onChange={(e) => setFormData({...formData, alternateNumber1: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Alternate Number 2</label>
              <input value={formData.alternateNumber2} onChange={(e) => setFormData({...formData, alternateNumber2: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Date of Birth</label>
            <input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">Address</label>
            <input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">Allergies</label>
            <textarea value={formData.allergies} onChange={(e) => setFormData({...formData, allergies: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium">Medications</label>
            <textarea value={formData.medications} onChange={(e) => setFormData({...formData, medications: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium">Medical Conditions</label>
            <textarea value={formData.medicalConditions} onChange={(e) => setFormData({...formData, medicalConditions: e.target.value})} className="mt-1 block w-full border rounded px-3 py-2" rows={2} />
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