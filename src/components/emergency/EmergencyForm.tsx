import React, { useRef } from "react";
import { Camera, Upload } from "lucide-react";
import type { EmergencyInfo } from "../../types/emergency";

interface EmergencyFormProps {
  emergencyInfo: EmergencyInfo;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  onPhotoChange: (photo: File) => void;
}

export default function EmergencyForm({
  emergencyInfo,
  onChange,
  onPhotoChange,
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
        <div className="relative inline-block">
          {emergencyInfo.photo ? (
            <img
              src={
                typeof emergencyInfo.photo === "string"
                  ? emergencyInfo.photo
                  : URL.createObjectURL(emergencyInfo.photo)
              }
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4 border-orange-200"
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
        <p className="mt-2 text-sm text-gray-600">Upload your photo (Max 50MB)</p>
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
            Alternate Number 1 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="alternateNumber1"
            value={emergencyInfo.alternateNumber1}
            onChange={onChange}
            required
            inputMode="numeric"
            autoComplete="tel"
            pattern="^\\+?\d{10,13}$"
            className="mt-1 block w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
            placeholder="+91 98765 43211"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Alternate Number 2 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="alternateNumber2"
            value={emergencyInfo.alternateNumber2}
            onChange={onChange}
            required
            inputMode="numeric"
            autoComplete="tel"
            pattern="^\\+?\d{10,13}$"
            className="mt-1 block w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
            placeholder="+91 98765 43212"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Blood Type
          </label>
          <select
            name="bloodType"
            value={emergencyInfo.bloodType}
            onChange={onChange}
            className="mt-1 block w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">Select Blood Type</option>
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
        <label className="block text-sm font-medium text-gray-700">
          Emergency Contact *
        </label>
        <input
          type="text"
          name="emergencyContact"
          value={emergencyInfo.emergencyContact}
          onChange={onChange}
          className="mt-1 block w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500"
          placeholder="Name: +91 98765 43210"
          required
        />
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
