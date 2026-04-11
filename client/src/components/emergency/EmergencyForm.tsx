import React, { useRef } from "react";
import { Camera, Upload, Plus, Trash2, User, Heart, Phone, FileText, Pill } from "lucide-react";
import type { EmergencyInfo } from "../../types/emergency";

interface EmergencyFormProps {
  emergencyInfo: EmergencyInfo;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  onPhotoChange: (photo: File) => void;
  onBloodTypeReportChange?: (file: File | null) => void;
  onPrescriptionOrDischargeReportChange?: (file: File | null) => void;
  onSurgicalInfoReportChange?: (file: File | null) => void;
  onAddEmergencyContact?: () => void;
  onRemoveEmergencyContact?: (index: number) => void;
  onEmergencyContactChange?: (index: number, field: "name" | "phone", value: string) => void;
}

export default function EmergencyForm({
  emergencyInfo,
  onChange,
  onPhotoChange,
  onBloodTypeReportChange,
  onPrescriptionOrDischargeReportChange,
  onSurgicalInfoReportChange,
  onAddEmergencyContact,
  onRemoveEmergencyContact,
  onEmergencyContactChange,
}: EmergencyFormProps) {
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const bloodTypeReportInputRef = useRef<HTMLInputElement>(null);
  const prescriptionReportInputRef = useRef<HTMLInputElement>(null);
  const medicalReportsInputRef = useRef<HTMLInputElement>(null);

  const handleRiderPhotoUpload = (photoUploadEvent: React.ChangeEvent<HTMLInputElement>) => {
    const selectedPhotoFile = photoUploadEvent.target.files?.[0];
    if (selectedPhotoFile) {
      onPhotoChange(selectedPhotoFile);
    }
  };

  return (
    <div className="space-y-6">
      {/* Photo Upload Section */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 flex items-center gap-3">
          <User className="h-6 w-6 text-white" />
          <h2 className="text-xl font-bold text-white">Profile Photo</h2>
        </div>
        <div className="p-8 flex flex-col items-center text-center">
          <p className="text-sm text-slate-600 mb-6">Upload a clear photo to help responders identify you</p>
          
          {emergencyInfo.photo && typeof emergencyInfo.photo !== "undefined" ? (
            <div className="relative mb-6">
              <img
                src={
                  typeof emergencyInfo.photo === "string"
                    ? (emergencyInfo.photo.startsWith('http') || emergencyInfo.photo.startsWith('data:'))
                      ? emergencyInfo.photo
                      : `${import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com'}${emergencyInfo.photo.startsWith('/') ? '' : '/'}${emergencyInfo.photo}`
                    : URL.createObjectURL(emergencyInfo.photo)
                }
                alt="Profile"
                className="w-40 h-40 rounded-full object-cover border-4 border-blue-300 shadow-lg"
                onError={(e) => {
                  console.error('Failed to load photo:', emergencyInfo.photo);
                  (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/%3E%3Ccircle cx="12" cy="7" r="4"/%3E%3C/svg%3E';
                }}
              />
              <button
                type="button"
                onClick={() => profilePhotoInputRef.current?.click()}
                className="absolute -bottom-3 -right-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-transform hover:scale-110"
              >
                <Camera className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="relative mb-6">
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border-4 border-blue-200 shadow-lg">
                <Camera className="h-16 w-16 text-slate-400" />
              </div>
              <button
                type="button"
                onClick={() => profilePhotoInputRef.current?.click()}
                className="absolute -bottom-3 -right-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-transform hover:scale-110"
              >
                <Upload className="h-5 w-5" />
              </button>
            </div>
          )}

          <input
            ref={profilePhotoInputRef}
            type="file"
            accept="image/*"
            onChange={handleRiderPhotoUpload}
            className="hidden"
          />
          <p className="text-xs text-slate-500">Max 10MB • JPG, PNG</p>
        </div>
      </div>

      {/* Basic Information */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center gap-3">
          <User className="h-6 w-6 text-white" />
          <h2 className="text-xl font-bold text-white">Personal Information</h2>
        </div>
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="fullName"
                value={emergencyInfo.fullName}
                onChange={onChange}
                autoComplete="name"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Phone Number <span className="text-red-500">*</span></label>
              <input
                type="tel"
                name="phoneNumber"
                value={emergencyInfo.phoneNumber}
                onChange={onChange}
                required
                inputMode="numeric"
                autoComplete="tel"
                pattern="^\\+?\d{10,13}$"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="h-6 w-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Emergency Contacts</h2>
              <p className="text-emerald-100 text-sm">At least 1, up to 5 contacts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onAddEmergencyContact}
            disabled={(emergencyInfo.emergencyContacts?.length || 0) >= 5}
            className="bg-white text-emerald-600 hover:bg-emerald-50 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>

        <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-6 py-4 border-b border-slate-200">
          <div className="flex items-start gap-3">
            <Phone className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-700">These people will be notified immediately in case of emergency. Choose people who can reach you quickly and make important decisions.</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {emergencyInfo.emergencyContacts && emergencyInfo.emergencyContacts.length > 0 ? (
            emergencyInfo.emergencyContacts.map((contact, index) => (
              <div key={index} className="rounded-lg border-2 border-slate-200 p-4 hover:border-emerald-300 hover:bg-emerald-50 transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-600 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">Contact {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveEmergencyContact?.(index)}
                    disabled={(emergencyInfo.emergencyContacts?.length || 0) <= 1}
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      (emergencyInfo.emergencyContacts?.length || 0) <= 1
                        ? "At least one contact is required"
                        : "Remove contact"
                    }
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-2">Name</label>
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) =>
                        onEmergencyContactChange?.(index, "name", e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                      placeholder="Full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) =>
                        onEmergencyContactChange?.(index, "phone", e.target.value)
                      }
                      inputMode="numeric"
                      pattern="^\\+?\d{10,13}$"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                      placeholder="+91 98765 43210"
                      required
                      aria-required="true"
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Phone className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-700 font-semibold">No contacts yet</p>
              <p className="text-sm text-slate-600 mt-1">Add at least one emergency contact</p>
            </div>
          )}
        </div>
      </div>

      {/* Blood Group & Health Info */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-pink-600 px-6 py-4 flex items-center gap-3">
          <FileText className="h-6 w-6 text-white" />
          <div>
            <h2 className="text-xl font-bold text-white">Health Information</h2>
            <p className="text-red-100 text-sm">Blood Group Required</p>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Blood Type <span className="text-red-500">*</span></label>
              <select
                name="bloodType"
                value={emergencyInfo.bloodType}
                onChange={onChange}
                required
                aria-required="true"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
              >
                <option value="">Select Blood Type</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Date of Birth <span className="text-red-500">*</span></label>
              <input
                type="date"
                name="dateOfBirth"
                value={emergencyInfo.dateOfBirth}
                onChange={onChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-red-600" />
              Blood Group Report
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-red-50 transition cursor-pointer">
              <input
                ref={bloodTypeReportInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => onBloodTypeReportChange?.(e.target.files?.[0] || null)}
                className="hidden"
                id="blood-report"
              />
              <label htmlFor="blood-report" className="cursor-pointer">
                <Upload className="h-5 w-5 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">Upload Blood Report</p>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG, PDF up to 10MB (Optional)</p>
              </label>
            </div>
            {emergencyInfo.bloodTypeReport && (
              <p className="mt-2 text-xs text-green-600 font-medium">✓ {typeof emergencyInfo.bloodTypeReport === 'string' ? 'Report attached' : emergencyInfo.bloodTypeReport.name}</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={emergencyInfo.email}
                onChange={onChange}
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Address</label>
              <input
                type="text"
                name="address"
                value={emergencyInfo.address}
                onChange={onChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                placeholder="Your residential address"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Medical Information */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4 flex items-center gap-3">
          <Pill className="h-6 w-6 text-white" />
          <div>
            <h2 className="text-xl font-bold text-white">Medical Information</h2>
            <p className="text-purple-100 text-sm">All fields are optional</p>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Allergies</label>
            <textarea
              name="allergies"
              value={emergencyInfo.allergies}
              onChange={onChange}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none"
              rows={2}
              placeholder="List any known allergies (e.g., Penicillin, Peanuts, Latex)"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Current Medications</label>
            <textarea
              name="medications"
              value={emergencyInfo.medications}
              onChange={onChange}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none"
              rows={2}
              placeholder="List current medications with dosages (e.g., Aspirin 100mg daily)"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Medical Conditions</label>
            <textarea
              name="medicalConditions"
              value={emergencyInfo.medicalConditions}
              onChange={onChange}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none"
              rows={2}
              placeholder="List chronic conditions or medical history (e.g., Diabetes, Heart condition)"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                Discharge / Prescription
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center hover:bg-purple-50 transition cursor-pointer">
                <input
                  ref={prescriptionReportInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => onPrescriptionOrDischargeReportChange?.(e.target.files?.[0] || null)}
                  className="hidden"
                  id="prescription-report"
                />
                <label htmlFor="prescription-report" className="cursor-pointer">
                  <Upload className="h-4 w-4 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs font-medium text-slate-700">Upload Document</p>
                  <p className="text-xs text-slate-500">PNG, JPG, PDF</p>
                </label>
              </div>
              {emergencyInfo.prescriptionOrDischargeReport && (
                <p className="mt-2 text-xs text-green-600 font-medium">✓ {typeof emergencyInfo.prescriptionOrDischargeReport === 'string' ? 'Document attached' : emergencyInfo.prescriptionOrDischargeReport.name}</p>
              )}
              <p className="mt-2 text-xs text-slate-600">📄 Recent discharge & prescriptions</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                Medical Reports
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center hover:bg-purple-50 transition cursor-pointer">
                <input
                  ref={medicalReportsInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => onSurgicalInfoReportChange?.(e.target.files?.[0] || null)}
                  className="hidden"
                  id="medical-reports"
                />
                <label htmlFor="medical-reports" className="cursor-pointer">
                  <Upload className="h-4 w-4 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs font-medium text-slate-700">Upload Document</p>
                  <p className="text-xs text-slate-500">PNG, JPG, PDF</p>
                </label>
              </div>
              {emergencyInfo.surgicalInfoReport && (
                <p className="mt-2 text-xs text-green-600 font-medium">✓ {typeof emergencyInfo.surgicalInfoReport === 'string' ? 'Report attached' : emergencyInfo.surgicalInfoReport.name}</p>
              )}
              <p className="mt-2 text-xs text-slate-600">🏥 Scans, reports & specialist notes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
