import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { 
  User, Mail, Phone, Droplet, Calendar, MapPin, Pill, AlertCircle, Share2, Printer
} from "lucide-react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

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

  const completeness = useMemo(() => {
    const fields = [
      info.bloodType,
      info.emergencyContact,
      info.allergies,
      info.medications,
      info.medicalConditions,
      info.dateOfBirth,
      info.phoneNumber,
      info.address,
      info.photo,
    ];
    const filled = fields.filter((f) => f && String(f).trim() !== "").length;
    const total = fields.length;
    return Math.round((filled / total) * 100);
  }, [info]);

  const chartData = useMemo(() => ({
    labels: ["Complete", "Missing"],
    datasets: [
      {
        data: [completeness, 100 - completeness],
        backgroundColor: ["#10b981", "#e5e7eb"],
        borderWidth: 0,
      },
    ],
  }), [completeness]);

  const sharePage = async () => {
    try {
      const url = window.location.href;
      if (navigator.share) {
        await navigator.share({ title: `Emergency Info - ${info.fullName}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Link copied to clipboard");
      }
    } catch (_) {}
  };

  const printPage = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-28 h-28 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
            {info.photo ? (
              <img src={info.photo} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{info.fullName}</h1>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-100">
                <Droplet className="w-4 h-4" /> Blood: <span className="font-semibold">{info.bloodType || "N/A"}</span>
              </span>
              <a href={`tel:${info.phoneNumber}`} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                <Phone className="w-4 h-4" /> {info.phoneNumber || "No phone"}
              </a>
              <a href={`mailto:${info.email}`} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                <Mail className="w-4 h-4" /> {info.email}
              </a>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={sharePage} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
              <Share2 className="w-4 h-4" /> Share
            </button>
            <button onClick={printPage} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 border">
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>
      </div>

      {/* Summary + Chart */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 md:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-gray-500">Date of Birth</div>
                <div className="font-medium">{info.dateOfBirth || '—'}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-gray-500">Address</div>
                <div className="font-medium">{info.address || '—'}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Pill className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-gray-500">Medications</div>
                <div className="font-medium">{info.medications || '—'}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-gray-500">Allergies</div>
                <div className="font-medium">{info.allergies || '—'}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Completeness</h2>
          <div className="w-40 h-40 mx-auto">
            <Doughnut data={chartData} options={{ cutout: "70%", plugins: { legend: { display: false } } }} />
          </div>
          <div className="mt-3 text-center text-sm text-gray-600">{completeness}% of key info provided</div>
        </div>
      </div>

      {/* Medical Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Medical Details</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs uppercase text-gray-500 mb-2">Emergency Contact</div>
            <div className="p-4 rounded-lg border bg-gray-50">
              {info.emergencyContact || '—'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-500 mb-2">Medical Conditions</div>
            <div className="p-4 rounded-lg border bg-gray-50">
              {info.medicalConditions || '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
