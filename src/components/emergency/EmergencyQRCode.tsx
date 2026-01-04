import React, { useState } from "react";
import { Shield, CheckCircle, Upload, Loader, Plus, Trash2 } from "lucide-react";
import * as QRCodeLib from 'qrcode';
import type { EmergencyInfo, EmergencyContact } from "../../types/emergency";
import EmergencyForm from "./EmergencyForm";

export default function EmergencyQRCode() {
  // Fresh state every load (no localStorage persistence)
  const [emergencyInfo, setEmergencyInfo] = useState<EmergencyInfo>({
    fullName: "",
    email: "",
    bloodType: "",
    emergencyContacts: [{ name: "", phone: "" }],
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
  const [consentChecked, setConsentChecked] = useState(false);


  const handleAddEmergencyContact = () => {
    if (emergencyInfo.emergencyContacts.length < 5) {
      setEmergencyInfo((prev) => ({
        ...prev,
        emergencyContacts: [...prev.emergencyContacts, { name: "", phone: "" }],
      }));
    }
  };

  const handleRemoveEmergencyContact = (index: number) => {
    if (emergencyInfo.emergencyContacts.length > 1) {
      setEmergencyInfo((prev) => ({
        ...prev,
        emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== index),
      }));
    }
  };

  const handleEmergencyContactChange = (
    index: number,
    field: keyof EmergencyContact,
    value: string
  ) => {
    setEmergencyInfo((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      ),
    }));
  };

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

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com'}/api/extract-medical-info`, {
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
    if (!consentChecked) {
      alert("Please confirm your consent before submitting.");
      return;
    }
    if (!emergencyInfo.fullName || !emergencyInfo.phoneNumber || !emergencyInfo.dateOfBirth) {
      alert("Please enter your full name, phone number, and date of birth before submitting.");
      return;
    }
    if (!emergencyInfo.bloodType) {
      alert("Please select your blood type before submitting.");
      return;
    }
    if (!emergencyInfo.photo) {
      alert("Please upload a photo before submitting.");
      return;
    }
    if (emergencyInfo.emergencyContacts.length === 0 || emergencyInfo.emergencyContacts.some(c => !c.name || !c.phone)) {
      alert("Please add at least 1 emergency contact with both name and phone number.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();

      // Generate QR code as PNG data URL
      const qrDataUrl = await generateQRPNG();
      
      formData.append('fullName', emergencyInfo.fullName);
      formData.append('email', emergencyInfo.email || '');
      formData.append('bloodType', emergencyInfo.bloodType || '');
      formData.append('emergencyContacts', JSON.stringify(emergencyInfo.emergencyContacts));
      formData.append('allergies', emergencyInfo.allergies || '');
      formData.append('medications', emergencyInfo.medications || '');
      formData.append('medicalConditions', emergencyInfo.medicalConditions || '');
      formData.append('dateOfBirth', emergencyInfo.dateOfBirth);
      formData.append('address', emergencyInfo.address || '');
      formData.append('phoneNumber', emergencyInfo.phoneNumber);
      formData.append('qrCode', qrDataUrl);
      if (emergencyInfo.photo instanceof File) {
        formData.append('photo', emergencyInfo.photo);
      }

      // Log what we're sending (for debugging)
      console.log('📤 Sending to backend:');
      console.log('  - fullName:', emergencyInfo.fullName);
      console.log('  - phoneNumber:', emergencyInfo.phoneNumber);
      console.log('  - email:', emergencyInfo.email);
      console.log('  - dateOfBirth:', emergencyInfo.dateOfBirth);
      console.log('  - emergencyContacts:', emergencyInfo.emergencyContacts.length, 'contacts');
      console.log('  - photo:', emergencyInfo.photo instanceof File ? 'File uploaded' : 'No file');

      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com'}/api/emergency`,
        {
          method: "POST",
          body: formData,
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!res.ok) {
        // Get the error details from backend
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Backend error response:', errorData);
        
        // Handle specific error cases
        if (res.status === 502 || res.status === 503) {
          throw new Error('Backend server is currently unavailable. Please try again later.');
        } else if (res.status === 0 || res.statusText === 'Failed to fetch') {
          throw new Error('CORS error or network issue. Make sure the backend has CORS enabled for localhost:5173');
        }
        
        throw new Error(errorData.error || `Backend returned ${res.status}: ${res.statusText}`);
      }

      // Get the response which should contain the saved photo URL
      const responseData = await res.json();
      console.log('✅ Backend response:', responseData);

      setShowSuccess(true);
      
      // Clear the form after successful submission
      setEmergencyInfo({
        fullName: '',
        email: '',
        bloodType: '',
        emergencyContacts: [{ name: '', phone: '' }],
        allergies: '',
        medications: '',
        medicalConditions: '',
        photo: null,
        dateOfBirth: '',
        address: '',
        phoneNumber: '',
      });
      
      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      console.error('❌ Submission error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong while saving data.';
      alert(`Error: ${errorMessage}\n\nPlease check the console for more details.`);
    } finally {
      setSubmitting(false);
    }
  };

  const resolveBaseUrl = () => {
    return 'https://incaseforh.vercel.app';
  };

  const generateQRData = () => {
    const { photo, ...dataWithoutPhoto } = emergencyInfo;
    const baseUrl = resolveBaseUrl();
    const identifier = (dataWithoutPhoto.email?.trim().toLowerCase() || dataWithoutPhoto.phoneNumber);
    return `${baseUrl}/emergencyinfo/${encodeURIComponent(identifier)}`;
  };

  const generateQRPNG = async (): Promise<string> => {
    const qrValue = generateQRData();
    
    try {
      // Use qrcode library to generate PNG data URL
      const dataUrl = await QRCodeLib.toDataURL(qrValue, { 
        width: 300, 
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      console.log('QR Code generated successfully:', dataUrl.substring(0, 50) + '...');
      return dataUrl;
    } catch (err) {
      console.error('QR generation failed:', err);
      throw new Error('Failed to generate QR code: ' + (err instanceof Error ? err.message : String(err)));
    }
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
          
          {/* ===== COMMENTED OUT: AI Medical Document Upload Feature (Will be implemented later) ===== */}
          {/* 
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
                accept="image/*,.pdf"
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
          */}
          {/* ===== END COMMENTED OUT CODE ===== */}

          <EmergencyForm
            emergencyInfo={emergencyInfo}
            onChange={handleChange}
            onPhotoChange={handlePhotoChange}
            onAddEmergencyContact={handleAddEmergencyContact}
            onRemoveEmergencyContact={handleRemoveEmergencyContact}
            onEmergencyContactChange={handleEmergencyContactChange}
          />
          
          <div className="mt-6">
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-orange-500"
                />
                <span className="text-sm text-gray-700">
                  I confirm that I am submitting this emergency information with full understanding of its purpose. This data will be used to provide critical medical and contact information to first responders and family members in emergency situations.
                </span>
              </label>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || !consentChecked}
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
