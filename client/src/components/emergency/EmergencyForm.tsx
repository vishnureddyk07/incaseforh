import React, { useRef } from "react";
import { Camera, Upload, Plus, Trash2, AlertTriangle } from "lucide-react";
import type { EmergencyInfo } from "../../types/emergency";

interface EmergencyFormProps {
  emergencyInfo: EmergencyInfo;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  onPhotoChange: (photo: File) => void;
  onAddEmergencyContact?: () => void;
  onRemoveEmergencyContact?: (index: number) => void;
  onEmergencyContactChange?: (index: number, field: "name" | "phone", value: string) => void;
}

export default function EmergencyForm({
  emergencyInfo,
  onChange,
  onPhotoChange,
  onAddEmergencyContact,
  onRemoveEmergencyContact,
  onEmergencyContactChange,
}: EmergencyFormProps) {
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  const handleRiderPhotoUpload = (photoUploadEvent: React.ChangeEvent<HTMLInputElement>) => {
    const selectedPhotoFile = photoUploadEvent.target.files?.[0];
    if (selectedPhotoFile) {
      onPhotoChange(selectedPhotoFile);
    }
  };

  return (
    <div className="space-y-8">
      {/* Photo Upload Section */}
      <div className="card-elevated p-8">
        <div className="flex flex-col items-center">
          <label className="label text-center mb-0">Profile Photo</label>
          <p className="text-sm text-neutral-500 mb-6">(Optional - helps responders identify you)</p>
          
          <div className="relative mb-6">
            {emergencyInfo.photo && typeof emergencyInfo.photo !== "undefined" ? (
              <img
                src={
                  typeof emergencyInfo.photo === "string"
                    ? (emergencyInfo.photo.startsWith('http') || emergencyInfo.photo.startsWith('data:'))
                      ? emergencyInfo.photo
                      : `${import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com'}${emergencyInfo.photo.startsWith('/') ? '' : '/'}${emergencyInfo.photo}`
                    : URL.createObjectURL(emergencyInfo.photo)
                }
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-primary-200 shadow-md"
                onError={(e) => {
                  console.error('Failed to load photo:', emergencyInfo.photo);
                  (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/%3E%3Ccircle cx="12" cy="7" r="4"/%3E%3C/svg%3E';
                }}
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-neutral-100 flex items-center justify-center border-4 border-primary-100">
                <Camera className="h-12 w-12 text-neutral-400" />
              </div>
            )}
            <button
              type="button"
              onClick={() => profilePhotoInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 btn-primary-sm rounded-full shadow-lg hover:shadow-xl"
            >
              <Upload className="h-4 w-4" />
            </button>
          </div>

          <input
            ref={profilePhotoInputRef}
            type="file"
            accept="image/*"
            onChange={handleRiderPhotoUpload}
            className="hidden"
          />
          <p className="text-xs text-neutral-500">Max 10MB • JPG, PNG</p>
        </div>
      </div>

      {/* Basic Information */}
      <div className="card-elevated p-8">
        <h3 className="text-lg font-bold text-neutral-900 mb-6">Basic Information</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="label label-required">Full Name</label>
            <input
              type="text"
              name="fullName"
              value={emergencyInfo.fullName}
              onChange={onChange}
              autoComplete="name"
              className="input"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label className="label label-required">Phone Number</label>
            <input
              type="tel"
              name="phoneNumber"
              value={emergencyInfo.phoneNumber}
              onChange={onChange}
              required
              inputMode="numeric"
              autoComplete="tel"
              pattern="^\\+?\d{10,13}$"
              className="input"
              placeholder="+91 98765 43210"
            />
          </div>
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="card-elevated p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">Emergency Contacts</h3>
            <p className="text-sm text-neutral-500 mt-1">At least 1, up to 5 emergency contacts</p>
          </div>
          <button
            type="button"
            onClick={onAddEmergencyContact}
            disabled={(emergencyInfo.emergencyContacts?.length || 0) >= 5}
            className="btn-primary-sm flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>

        <div className="space-y-4">
          {emergencyInfo.emergencyContacts && emergencyInfo.emergencyContacts.length > 0 ? (
            emergencyInfo.emergencyContacts.map((contact, index) => (
              <div key={index} className="border border-neutral-200 rounded-lg p-6 bg-neutral-50 hover:bg-white transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-neutral-900">Contact {index + 1}</p>
                    {contact.name && <p className="text-sm text-neutral-600 mt-1">{contact.name}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveEmergencyContact?.(index)}
                    disabled={(emergencyInfo.emergencyContacts?.length || 0) <= 1}
                    className="text-neutral-400 hover:text-red-500 hover:bg-red-50 p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      (emergencyInfo.emergencyContacts?.length || 0) <= 1
                        ? "At least one contact is required"
                        : "Remove contact"
                    }
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="label label-required">Name</label>
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) =>
                        onEmergencyContactChange?.(index, "name", e.target.value)
                      }
                      className="input"
                      placeholder="Contact name"
                      required
                    />
                  </div>

                  <div>
                    <label className="label label-required">Phone Number</label>
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) =>
                        onEmergencyContactChange?.(index, "phone", e.target.value)
                      }
                      inputMode="numeric"
                      pattern="^\\+?\d{10,13}$"
                      className="input"
                      placeholder="+91 98765 43210"
                      required
                      aria-required="true"
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state py-12">
              <AlertTriangle className="empty-state-icon" />
              <p className="empty-state-title">No contacts yet</p>
              <p className="empty-state-description">Add at least one emergency contact</p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Information */}
      <div className="card-elevated p-8">
        <h3 className="text-lg font-bold text-neutral-900 mb-6">Additional Information</h3>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="label label-required">Blood Type</label>
            <select
              name="bloodType"
              value={emergencyInfo.bloodType}
              onChange={onChange}
              required
              aria-required="true"
              className="input"
            >
              <option value="" disabled>Select Blood Type</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label label-required">Date of Birth</label>
            <input
              type="date"
              name="dateOfBirth"
              value={emergencyInfo.dateOfBirth}
              onChange={onChange}
              required
              className="input"
            />
          </div>
        </div>

        <div className="mt-6">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              name="email"
              value={emergencyInfo.email}
              onChange={onChange}
              autoComplete="email"
              className="input"
              placeholder="your@email.com"
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="label">Address</label>
          <textarea
            name="address"
            value={emergencyInfo.address}
            onChange={onChange}
            className="textarea"
            rows={3}
            placeholder="Complete address with city, state, and postal code"
          />
        </div>
      </div>

      {/* Medical Information */}
      <div className="card-elevated p-8">
        <h3 className="text-lg font-bold text-neutral-900 mb-6">Medical Information</h3>
        
        <div>
          <label className="label">Allergies</label>
          <textarea
            name="allergies"
            value={emergencyInfo.allergies}
            onChange={onChange}
            className="textarea"
            rows={3}
            placeholder="List any known allergies (e.g., Penicillin, Peanuts, Latex)"
          />
        </div>

        <div className="mt-6">
          <label className="label">Current Medications</label>
          <textarea
            name="medications"
            value={emergencyInfo.medications}
            onChange={onChange}
            className="textarea"
            rows={3}
            placeholder="List current medications with dosages (e.g., Aspirin 100mg daily)"
          />
        </div>

        <div className="mt-6">
          <label className="label">Medical Conditions</label>
          <textarea
            name="medicalConditions"
            value={emergencyInfo.medicalConditions}
            onChange={onChange}
            className="textarea"
            rows={3}
            placeholder="List chronic conditions or important medical history (e.g., Diabetes, Heart condition)"
          />
        </div>
      </div>
    </div>
  );
}
