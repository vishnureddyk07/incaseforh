import React, { useState } from "react";
import { Shield, CheckCircle, Upload, Loader } from "lucide-react";
import type { EmergencyInfo } from "../../types/emergency";
import EmergencyForm from "./EmergencyForm";

export default function EmergencyQRCode() {
  const [emergencyInfo, setEmergencyInfo] = useState<EmergencyInfo>({
    fullName: "",
    email: "",
    bloodType: "",
    emergencyContact: "",
    allergies: "",
    medications: "",
    medicalConditions: "",
    photo: null,
    dateOfBirth: "",
    address: "",
    phoneNumber: "",
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [reportDate, setReportDate] = useState("");

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setEmergencyInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (photoFile: File) => {
    setEmergencyInfo((prev) => ({ ...prev, photo: photoFile }));
  };

  const handleMedicalDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append('document', file);

      const res = await fetch('https://incaseforh.onrender.com/api/extract-medical-info', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to extract information');
      }

      const result = await res.json();
      const data = result.data;

      // Auto-fill form with extracted data
      setEmergencyInfo((prev) => ({
        ...prev,
        fullName: data.fullName || prev.fullName,
        bloodType: data.bloodType || prev.bloodType,
        allergies: data.allergies || prev.allergies,
        medications: data.medications || prev.medications,
        medicalConditions: data.medicalConditions || prev.medicalConditions,
        emergencyContact: data.emergencyContact || prev.emergencyContact,
        dateOfBirth: data.dateOfBirth || prev.dateOfBirth,
      }));

      if (data.dateOfReport) {
        setReportDate(data.dateOfReport);
      }

      alert('Medical information extracted successfully! Please review and update if needed.');
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to extract medical information');
    } finally {
      setExtracting(false);
      e.target.value = ''; // Reset file input
    }
  };

  const handleSubmit = async () => {
    if (!emergencyInfo.fullName || !emergencyInfo.email) {
      alert("Please enter your full name and email before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();

      const qrData = generateQRData();
      formData.append('fullName', emergencyInfo.fullName);
      formData.append('email', emergencyInfo.email);
      formData.append('bloodType', emergencyInfo.bloodType || '');
      formData.append('emergencyContact', emergencyInfo.emergencyContact || '');
      formData.append('allergies', emergencyInfo.allergies || '');
      formData.append('medications', emergencyInfo.medications || '');
      formData.append('medicalConditions', emergencyInfo.medicalConditions || '');
      formData.append('dateOfBirth', emergencyInfo.dateOfBirth || '');
      formData.append('address', emergencyInfo.address || '');
      formData.append('phoneNumber', emergencyInfo.phoneNumber || '');
      formData.append('qrCode', qrData);
      if (emergencyInfo.photo instanceof File) {
        formData.append('photo', emergencyInfo.photo);
      }

      const res = await fetch(
        "https://incaseforh.onrender.com/api/emergency",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) throw new Error("Failed to save to backend");

      setShowSuccess(true);
      // Reset form
      setEmergencyInfo({
        fullName: "",
        email: "",
        bloodType: "",
        emergencyContact: "",
        allergies: "",
        medications: "",
        medicalConditions: "",
        photo: null,
        dateOfBirth: "",
        address: "",
        phoneNumber: "",
      });

      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      alert("Something went wrong while saving data.");
    } finally {
      setSubmitting(false);
    }
  };

  const generateQRData = () => {
    const { photo, ...dataWithoutPhoto } = emergencyInfo;
    const baseUrl = window.location.origin;
    const email = dataWithoutPhoto.email?.trim().toLowerCase();
    return `${baseUrl}/emergencyinfo/${encodeURIComponent(email)}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center mb-8">
          <Shield className="h-8 w-8 text-orange-500 mr-3" />
          <h3 className="text-2xl font-bold text-gray-900">
            Emergency Information Registration
          </h3>
        </div>

        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Personal Information
          </h4>
          
          {/* AI Document Upload */}
          <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h5 className="font-semibold text-blue-900">Quick Fill with AI</h5>
                <p className="text-sm text-blue-700">Upload medical report or prescription</p>
              </div>
              {extracting && <Loader className="h-5 w-5 animate-spin text-blue-600" />}
            </div>
            <label className="block">
              <input
                type="file"
                accept="image/*"
                onChange={handleMedicalDocUpload}
                disabled={extracting}
                className="hidden"
                id="medical-doc-upload"
              />
              <label
                htmlFor="medical-doc-upload"
                className="cursor-pointer inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {extracting ? 'Analyzing...' : 'Upload Medical Document'}
              </label>
            </label>
            {reportDate && (
              <p className="mt-2 text-sm text-blue-800">
                📅 Report Date: {new Date(reportDate).toLocaleDateString()}
              </p>
            )}
          </div>

          <EmergencyForm
            emergencyInfo={emergencyInfo}
            onChange={handleChange}
            onPhotoChange={handlePhotoChange}
          />
          
          <div className="mt-6">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-orange-500 text-white px-8 py-3 rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
            >
              {submitting ? "Submitting..." : "Submit Information"}
            </button>
          </div>
        </div>
      </div>

      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full text-center shadow-2xl">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Success!</h3>
            <p className="text-gray-700 mb-2">
              Your emergency information has been saved successfully.
            </p>
            <p className="text-gray-600 text-sm">
              Your QR code sticker will be handed over to you shortly.
            </p>
            <button
              onClick={() => setShowSuccess(false)}
              className="mt-6 bg-orange-500 text-white px-6 py-2 rounded-full hover:bg-orange-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
