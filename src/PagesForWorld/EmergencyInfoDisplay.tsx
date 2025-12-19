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
  console.log(email);
  const [info, setInfo] = useState<EmergencyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) return;

    fetch(`https://incaseforh.onrender.com/api/emergency/${email}`)
      .then((res) => res.json())
      .then((data) => {
        setInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [email]);

  if (loading)
    return <div className="p-6 text-lg">Loading emergency info...</div>;
  if (!info) return <div className="p-6 text-lg">No information found.</div>;
  console.log("info", info);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        {/* Photo */}
        {info.photo && (
          <div className="mb-6 flex justify-center">
            <img
              src={info.photo}
              alt="Emergency Profile"
              className="w-48 h-48 rounded-lg object-cover border-4 border-orange-300"
            />
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl font-bold mb-6 text-gray-900">
          {info.fullName || 'Emergency Information'}
        </h1>

        {/* All Fields - Guaranteed to Display */}
        <div className="space-y-4 text-gray-800">
          <div className="border-b pb-3">
            <p className="text-sm text-gray-600">Email</p>
            <p className="text-lg font-medium">{info.email || '—'}</p>
          </div>

          <div className="border-b pb-3">
            <p className="text-sm text-gray-600">Blood Type</p>
            <p className="text-lg font-medium">{info.bloodType || '—'}</p>
          </div>

          <div className="border-b pb-3">
            <p className="text-sm text-gray-600">Emergency Contact</p>
            <p className="text-lg font-medium">{info.emergencyContact || '—'}</p>
          </div>

          <div className="border-b pb-3">
            <p className="text-sm text-gray-600">Phone Number</p>
            <p className="text-lg font-medium">{info.phoneNumber || '—'}</p>
          </div>

          <div className="border-b pb-3">
            <p className="text-sm text-gray-600">Date of Birth</p>
            <p className="text-lg font-medium">{info.dateOfBirth || '—'}</p>
          </div>

          <div className="border-b pb-3">
            <p className="text-sm text-gray-600">Address</p>
            <p className="text-lg font-medium">{info.address || '—'}</p>
          </div>

          <div className="border-b pb-3">
            <p className="text-sm text-gray-600">Allergies</p>
            <p className="text-lg font-medium">{info.allergies || '—'}</p>
          </div>

          <div className="border-b pb-3">
            <p className="text-sm text-gray-600">Medications</p>
            <p className="text-lg font-medium">{info.medications || '—'}</p>
          </div>

          <div className="pb-3">
            <p className="text-sm text-gray-600">Medical Conditions</p>
            <p className="text-lg font-medium">{info.medicalConditions || '—'}</p>
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
