// Basic display version (charts removed; reverted UI)
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

type EmergencyInfo = {
  fullName: string;
  email: string;
  bloodType: string;
  emergencyContact: string;
  allergies: string;
  medications: string;
  medicalConditions: string;
  dateOfBirth: string;
  phoneNumber: string;
  address: string;
  photo: string;
};

export default function EmergencyInfoDisplay() {
  const { email } = useParams();
  console.log("🔍 Route email param:", email);
  const [info, setInfo] = useState<EmergencyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      console.error("❌ No email param");
      setError("No email provided");
      setLoading(false);
      return;
    }

    console.log("📡 Fetching from:", `https://incaseforh.onrender.com/api/emergency/${email}`);
    fetch(`https://incaseforh.onrender.com/api/emergency/${email}`)
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
  }, [email]);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-red-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-6 max-w-md text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <p className="text-sm text-gray-600">Email: {email}</p>
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
          <p className="text-gray-700 mb-4">No information found for this email.</p>
          <p className="text-sm text-gray-600">Email: {email}</p>
        </div>
      </div>
    );
  }

  console.log("✅ Rendering with info:", info);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        {/* Photo */}
        {info.photo ? (
          <div className="mb-6 flex justify-center">
            <img
              src={info.photo}
              alt="Emergency Profile"
              className="w-48 h-48 rounded-lg object-cover border-4 border-orange-300"
            />
          </div>
        ) : null}

        {/* Title */}
        <h1 className="text-3xl font-bold mb-6 text-gray-900">
          {info.fullName || "Emergency Information"}
        </h1>

        {/* All Fields - Guaranteed to Display */}
        <div className="space-y-4 text-gray-800">
          <div className="border-b pb-3">
            <p className="text-sm text-gray-600">Email</p>
            <p className="text-lg font-medium">{info.email || "—"}</p>
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
            <p className="text-sm text-gray-600">Phone Number</p>
            <p className="text-lg font-medium">{info.phoneNumber || "—"}</p>
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

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
          <p>Emergency Info • Scanned on {new Date().toLocaleDateString()}</p>
          <p>Call 108 for medical emergencies</p>
        </div>
      </div>
    </div>
  );
}
