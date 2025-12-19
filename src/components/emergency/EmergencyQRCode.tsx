import React, { useState } from "react";
import { Shield } from "lucide-react";
import type { EmergencyInfo } from "../../types/emergency";
import EmergencyForm from "./EmergencyForm";
import QRCodeDisplay from "./QRCodeDisplay";
import { downloadQRCode } from "../../utils/qrcode";

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

  const handleDownload = async () => {
    if (!emergencyInfo.fullName || !emergencyInfo.email) {
      alert(
        "Please enter your full name and email before downloading the QR code."
      );
      return;
    }

    try {
      const formData = new FormData();

      // Object.entries(emergencyInfo).forEach(([key, value]) => {
      //   if (value !== null) {
      //     if (value instanceof File) {
      //       formData.append(key, value);
      //     } else {
      //       formData.append(key, value.toString());
      //     }
      //   }
      // });

      // Temporarily send only text data
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

      // ✅ Log the actual contents of FormData
      console.log("FormData contents:");
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }

      const res = await fetch(
        "https://incaseforh.onrender.com/api/emergency",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) throw new Error("Failed to save to backend");

      const filename = `emergency-info-${emergencyInfo.fullName
        .toLowerCase()
        .replace(/\s+/g, "-")}`;
      downloadQRCode(generateQRData(), filename);
    } catch (err) {
      console.error(err);
      alert("Something went wrong while saving data.");
    }
  };

  const generateQRData = () => {
    const { photo, ...dataWithoutPhoto } = emergencyInfo;
    const baseUrl = window.location.origin;
    const email = dataWithoutPhoto.email?.trim().toLowerCase();
    return `${baseUrl}/emergencyinfo/${encodeURIComponent(email)}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center mb-8">
          <Shield className="h-8 w-8 text-orange-500 mr-3" />
          <h3 className="text-2xl font-bold text-gray-900">
            Emergency Information QR Code
          </h3>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Personal Information
            </h4>
            <EmergencyForm
              emergencyInfo={emergencyInfo}
              onChange={handleChange}
              onPhotoChange={handlePhotoChange}
            />
          </div>
          <div className="lg:border-l lg:pl-8">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Your Emergency QR Code
            </h4>
            <QRCodeDisplay
              qrValue={generateQRData()}
              onDownload={handleDownload}
            />
          </div>
          <div>
            <button
              className="bg-blue-300 p-3 rounded-lg"
              onClick={() => {
                window.location.href = "/emergencyinfo/test";
              }}
            >
              Click me i say
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
