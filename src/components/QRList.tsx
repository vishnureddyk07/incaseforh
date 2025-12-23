import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface EmergencyInfo {
  _id: string;
  fullName: string;
  email: string;
  qrCode: string;
  photo?: string;
  // other fields if needed
}

export default function QRList() {
  const [qrs, setQrs] = useState<EmergencyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {qrs.map(qr => (
          <button
            key={qr._id}
            onClick={() => handleOpen(qr.email)}
            className="text-left bg-white p-4 rounded-lg shadow hover:shadow-md transition flex gap-4"
          >
            {qr.photo ? (
              <img src={qr.photo} alt={qr.fullName} className="w-20 h-20 rounded object-cover border" />
            ) : (
              <div className="w-20 h-20 rounded bg-gray-100 grid place-items-center text-gray-500">No Photo</div>
            )}
            <div>
              <h3 className="text-lg font-semibold">{qr.fullName}</h3>
              <p className="text-sm text-gray-600">{qr.email}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}