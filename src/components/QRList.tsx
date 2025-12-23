import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import QRCodeDisplay from "./emergency/QRCodeDisplay"; // Assuming this can display QR
import { downloadQRCode } from "../utils/qrcode";
import { useAuth } from "../context/AuthContext";

interface EmergencyInfo {
  _id: string;
  fullName: string;
  email: string;
  qrCode: string;
  // other fields if needed
}

export default function QRList() {
  const [qrs, setQrs] = useState<EmergencyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, token, user } = useAuth();

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

  const handleDownload = (qrValue: string, filename: string) => {
    downloadQRCode(qrValue, filename);
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Saved QR Codes</h2>
        <Link 
          to="/change-password" 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Change Password
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {qrs.map(qr => (
          <div key={qr._id} className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold">{qr.fullName}</h3>
            <p>{qr.email}</p>
            <QRCodeDisplay qrValue={qr.qrCode} onDownload={() => handleDownload(qr.qrCode, `qr-${qr.email}`)} />
          </div>
        ))}
      </div>
    </div>
  );
}