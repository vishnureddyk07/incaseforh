// Basic display version (charts removed; reverted UI)
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

type EmergencyInfo = {
  fullName: string;
  email?: string;
  qrCode?: string;
  bloodType?: string;
  emergencyContact?: string;
  allergies?: string;
  medications?: string;
  medicalConditions?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  alternateNumber1?: string;
  alternateNumber2?: string;
  address?: string;
  photo?: string;
};

export default function EmergencyInfoDisplay() {
  const API_BASE = import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com';
  const PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><rect width="120" height="120" fill="%23f3f4f6"/><circle cx="60" cy="45" r="22" fill="%23d1d5db"/><rect x="25" y="75" width="70" height="30" rx="12" fill="%23d1d5db"/></svg>';

  const resolvePhoto = (photo?: string) => {
    if (!photo) return PLACEHOLDER;
    const src = photo.trim();
    if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) return src;
    return `${API_BASE}${src.startsWith('/') ? '' : '/'}${src}`;
  };
  const { email: identifierParam } = useParams();
  console.log("🔍 Route identifier param:", identifierParam);
  const [info, setInfo] = useState<EmergencyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!identifierParam) {
      console.error("❌ No email param");
      setError("No identifier provided");
      setLoading(false);
      return;
    }

    const isEmail = identifierParam.includes('@');
    const apiUrl = import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com';
    const endpoint = isEmail
      ? `${apiUrl}/api/emergency/${encodeURIComponent(identifierParam)}`
      : `${apiUrl}/api/emergency/phone/${encodeURIComponent(identifierParam)}`;

    console.log("📡 Fetching from:", endpoint);
    fetch(endpoint)
      .then((res) => {
        console.log("📊 Response status:", res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("✅ Data received: Object");
        console.log("   fullName:", data.fullName);
        console.log("   email:", data.email);
        console.log("   bloodType:", data.bloodType);
        console.log("   emergencyContact:", data.emergencyContact);
        console.log("   phoneNumber:", data.phoneNumber);
        console.log("   alternateNumber1:", data.alternateNumber1);
        console.log("   alternateNumber2:", data.alternateNumber2);
        console.log("   address:", data.address);
        console.log("   dateOfBirth:", data.dateOfBirth);
        console.log("   allergies:", data.allergies);
        console.log("   medications:", data.medications);
        console.log("   medicalConditions:", data.medicalConditions);
        console.log("   photo:", data.photo);
        setInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Fetch error:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [identifierParam]);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-red-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-6 max-w-md text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <p className="text-sm text-gray-600">Identifier: {identifierParam}</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="mt-4 text-gray-600">Loading emergency info...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!info) {
    return (
      <div className="min-h-screen bg-yellow-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-6 max-w-md text-center">
          <h1 className="text-xl font-bold text-yellow-600 mb-2">Not Found</h1>
          <p className="text-gray-700 mb-4">No information found for this identifier.</p>
          <p className="text-sm text-gray-600">Identifier: {identifierParam}</p>
        </div>
      </div>
    );
  }

  console.log("✅ Rendering with info:", info);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        {/* Photo */}
        <div className="mb-6 flex justify-center">
          <img
            src={resolvePhoto(info.photo)}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }}
            alt="Emergency Profile"
            className="w-48 h-48 rounded-lg object-cover border-4 border-orange-300"
          />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-6 text-gray-900">
          {info.fullName || "Emergency Information"}
        </h1>

        {/* All Fields - Guaranteed to Display */}
        <div className="space-y-4 text-gray-800">
          <div className="border-b pb-3">
            <p className="text-sm text-gray-600">Email (optional)</p>
            <p className="text-lg font-medium">{info.email || "—"}</p>
          </div>

          <div className="border-b pb-3">
            <p className="text-sm text-gray-600">Phone Number</p>
            <p className="text-lg font-medium">{info.phoneNumber || "—"}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-3">
            <div>
              <p className="text-sm text-gray-600">Alternate Number 1</p>
              <p className="text-lg font-medium">{info.alternateNumber1 || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Alternate Number 2</p>
              <p className="text-lg font-medium">{info.alternateNumber2 || "—"}</p>
            </div>
          </div>

          <div className="border-b pb-3">
            <p className="text-sm text-gray-600">Blood Type</p>
            <p className="text-lg font-medium">{info.bloodType || "—"}</p>
          </div>

          <div className="border-b pb-3">
            <p className="text-sm text-gray-600">Emergency Contact</p>
            <p className="text-lg font-medium">{info.emergencyContact || "—"}</p>
          </div>

          <div className="border-b pb-3">
            <p className="text-sm text-gray-600">Date of Birth</p>
            <p className="text-lg font-medium">{info.dateOfBirth || "—"}</p>
          </div>

          <div className="border-b pb-3">
            <p className="text-sm text-gray-600">Address</p>
            <p className="text-lg font-medium">{info.address || "—"}</p>
          </div>

          <div className="border-b pb-3">
            <p className="text-sm text-gray-600">Allergies</p>
            <p className="text-lg font-medium">{info.allergies || "—"}</p>
          </div>

          <div className="border-b pb-3">
            <p className="text-sm text-gray-600">Medications</p>
            <p className="text-lg font-medium">{info.medications || "—"}</p>
          </div>

          <div className="pb-3">
            <p className="text-sm text-gray-600">Medical Conditions</p>
            <p className="text-lg font-medium">{info.medicalConditions || "—"}</p>
          </div>
        </div>

        {/* Emergency Contact Numbers */}
        <div className="mt-8 pt-6 border-t">
          <h2 className="text-xl font-bold text-red-600 mb-4 text-center">Emergency Contact Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Ambulance</p>
              <a href="tel:108" className="text-2xl font-bold text-red-600">108</a>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Police</p>
              <a href="tel:100" className="text-2xl font-bold text-blue-600">100</a>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Fire</p>
              <a href="tel:101" className="text-2xl font-bold text-orange-600">101</a>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Women Helpline</p>
              <a href="tel:1091" className="text-2xl font-bold text-green-600">1091</a>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Child Helpline</p>
              <a href="tel:1098" className="text-2xl font-bold text-purple-600">1098</a>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Disaster Mgmt</p>
              <a href="tel:108" className="text-2xl font-bold text-indigo-600">1078</a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
          <p>Emergency Info • Scanned on {new Date().toLocaleDateString()}</p>
          <p>Call 108 for medical emergencies</p>
        </div>
      </div>
    </div>
  );
}
