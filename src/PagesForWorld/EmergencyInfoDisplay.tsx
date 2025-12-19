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
    <div className="max-w-2xl mx-auto p-6">
      {info.photo && (
        <div className="mb-6 flex justify-center">
          <img
            src={info.photo}
            alt="Emergency Profile"
            className="w-64 h-64 rounded-lg object-cover border-4 border-orange-300"
          />
        </div>
      )}

      <h1 className="text-2xl font-bold mb-4">
        Emergency Info for {info.fullName}
      </h1>
      <ul className="space-y-2 text-gray-700">
        <li>
          <strong>Email:</strong> {info.email}
        </li>
        <li>
          <strong>Blood Type:</strong> {info.bloodType}
        </li>
        <li>
          <strong>Emergency Contact:</strong> {info.emergencyContact}
        </li>
        <li>
          <strong>Allergies:</strong> {info.allergies}
        </li>
        <li>
          <strong>Medications:</strong> {info.medications}
        </li>
        <li>
          <strong>Medical Conditions:</strong> {info.medicalConditions}
        </li>
        <li>
          <strong>DOB:</strong> {info.dateOfBirth}
        </li>
        <li>
          <strong>Phone:</strong> {info.phoneNumber}
        </li>
        <li>
          <strong>Address:</strong> {info.address}
        </li>
      </ul>
    </div>
  );
}
