import React, { useRef } from "react";
import { Camera, Upload, Plus, Trash2 } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoChange(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Photo <span className="text-red-500">*</span>
        </label>
        <div className="relative inline-block">
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
              className="w-24 h-24 rounded-full object-cover border-4 border-orange-200"
              onError={(e) => {
                console.error('Failed to load photo:', emergencyInfo.photo);
                (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/%3E%3Ccircle cx="12" cy="7" r="4"/%3E%3C/svg%3E';
              }}
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-orange-200">
              <Camera className="h-8 w-8 text-gray-400" />
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-2 -right-2 bg-orange-500 text-white p-2 rounded-full hover:bg-orange-600 transition-colors"
          >
            <Upload className="h-4 w-4" />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />
        <p className="mt-2 text-sm text-gray-600">Upload your photo (Max 50MB) <span className="text-red-500">*</span></p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Full Name *
          </label>
          <input
            type="text"
            name="fullName"
            value={emergencyInfo.fullName}
            onChange={onChange}
            autoComplete="name"
            className="mt-1 block w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email (Optional)
          </label>
          <input
            type="email"
            name="email"
            value={emergencyInfo.email}
            onChange={onChange}
            autoComplete="email"
            className="mt-1 block w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="phoneNumber"
            value={emergencyInfo.phoneNumber}
            onChange={onChange}
            required
            inputMode="numeric"
            autoComplete="tel"
            pattern="^\\+?\d{10,13}$"
            className="mt-1 block w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
            placeholder="+91 98765 43210"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="dateOfBirth"
            value={emergencyInfo.dateOfBirth}
            onChange={onChange}
            required
            className="mt-1 block w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Blood Type <span className="text-red-500">*</span>
          </label>
          <select
            name="bloodType"
            value={emergencyInfo.bloodType}
            onChange={onChange}
            required
            aria-required="true"
            className="mt-1 block w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="" disabled>Select Blood Type</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Address
        </label>
        <textarea
          name="address"
          value={emergencyInfo.address}
          onChange={onChange}
          className="mt-1 block w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
          rows={2}
          placeholder="Complete address with pincode"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Emergency Contacts <span className="text-red-500">*</span>
            <span className="text-xs text-gray-500 ml-2">(Minimum 1, Maximum 5)</span>
          </label>
          <button
            type="button"
            onClick={onAddEmergencyContact}
            disabled={(emergencyInfo.emergencyContacts?.length || 0) >= 5}
            className="flex items-center gap-2 px-3 py-1 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        <div className="space-y-4">
          {emergencyInfo.emergencyContacts && emergencyInfo.emergencyContacts.length > 0 ? (
            emergencyInfo.emergencyContacts.map((contact, index) => (
              <div key={index} className="border rounded-md p-4 bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium text-sm text-gray-700">Contact {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => onRemoveEmergencyContact?.(index)}
                    disabled={(emergencyInfo.emergencyContacts?.length || 0) <= 1}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    title={
                      (emergencyInfo.emergencyContacts?.length || 0) <= 1
                        ? "At least one contact is required"
                        : "Remove contact"
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Contact Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) =>
                        onEmergencyContactChange?.(index, "name", e.target.value)
                      }
                      className="w-full px-3 py-2 border rounded-md text-sm focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Contact name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) =>
                        onEmergencyContactChange?.(index, "phone", e.target.value)
                      }
                      inputMode="numeric"
                      pattern="^\\+?\d{10,13}$"
                      className="w-full px-3 py-2 border rounded-md text-sm focus:ring-orange-500 focus:border-orange-500"
                      placeholder="+91 98765 43210"
                      required
                      aria-required="true"
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 italic">No emergency contacts added</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Allergies
        </label>
        <textarea
          name="allergies"
          value={emergencyInfo.allergies}
          onChange={onChange}
          className="mt-1 block w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
          rows={2}
          placeholder="List any known allergies"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Current Medications
        </label>
        <textarea
          name="medications"
          value={emergencyInfo.medications}
          onChange={onChange}
          className="mt-1 block w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
          rows={2}
          placeholder="List current medications and dosages"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Medical Conditions
        </label>
        <textarea
          name="medicalConditions"
          value={emergencyInfo.medicalConditions}
          onChange={onChange}
          className="mt-1 block w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
          rows={2}
          placeholder="List any chronic conditions or important medical history"
        />
      </div>
    </div>
  );
}
