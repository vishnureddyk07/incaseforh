import { useEffect, useState } from "react";
import QRCodeDisplay from "./emergency/QRCodeDisplay"; // Assuming this can display QR
import { downloadQRCode } from "../utils/qrcode";

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

  useEffect(() => {
    fetch('http://localhost:5000/api/emergency')
      .then(res => res.json())
      .then(data => {
        setQrs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleDownload = (qrValue: string, filename: string) => {
    downloadQRCode(qrValue, filename);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Saved QR Codes</h2>
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