import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface EmergencyInfo {
  _id: string;
  fullName: string;
  email: string;
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
}

export default function QRList() {
  const [qrs, setQrs] = useState<EmergencyInfo[]>([]);
  const [filteredQrs, setFilteredQrs] = useState<EmergencyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [editingRecord, setEditingRecord] = useState<EmergencyInfo | null>(null);
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

  const handleOpen = (email: string) => {
    navigate(`/emergencyinfo/${encodeURIComponent(email)}`);
  };

  // Search and filter logic
  useEffect(() => {
    let filtered = [...qrs];

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(q => 
        q.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sort
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b._id).getTime() - new Date(a._id).getTime());
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a._id).getTime() - new Date(b._id).getTime());
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.fullName.localeCompare(b.fullName));
    }

    setFilteredQrs(filtered);
  }, [searchTerm, sortBy, qrs]);

  const handleEdit = (e: React.MouseEvent, record: EmergencyInfo) => {
    e.stopPropagation();
    setEditingRecord(record);
  };

  const handleSaveEdit = async (updatedData: Partial<EmergencyInfo>) => {
    if (!editingRecord || !token) return;
    try {
      const res = await fetch(`https://incaseforh.onrender.com/api/emergency/${editingRecord.email}`, {
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
          placeholder="Search by name or email..."
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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredQrs.map((qr) => (
          <div key={qr._id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition">
            <div className="flex gap-4 cursor-pointer" onClick={() => handleOpen(qr.email)}>
              {qr.photo ? (
                <img src={qr.photo} alt={qr.fullName} className="w-20 h-20 rounded object-cover border" />
              ) : (
                <div className="w-20 h-20 rounded bg-gray-100 grid place-items-center text-gray-500 text-xs">No Photo</div>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{qr.fullName}</h3>
                <p className="text-sm text-gray-600">{qr.email}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(qr._id).toLocaleDateString()} {new Date(qr._id).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => handleEdit(e, qr)}
              className="mt-3 w-full text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
            >
              Edit Info
            </button>
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
    bloodType: record.bloodType || '',
    emergencyContact: record.emergencyContact || '',
    allergies: record.allergies || '',
    medications: record.medications || '',
    medicalConditions: record.medicalConditions || '',
    dateOfBirth: record.dateOfBirth || '',
    phoneNumber: record.phoneNumber || '',
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