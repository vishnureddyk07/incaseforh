import React from 'react';
import { Phone, Calendar, Droplets, AlertCircle, User, Home, Pill } from 'lucide-react';
import type { EmergencyInfo } from '../../types/emergency';

interface QRScanDisplayProps {
  emergencyData: EmergencyInfo;
}

export default function QRScanDisplay({ emergencyData }: QRScanDisplayProps) {
  const API_BASE = import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com';
  const PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><rect width="120" height="120" fill="%23f3f4f6"/><circle cx="60" cy="45" r="22" fill="%23d1d5db"/><rect x="25" y="75" width="70" height="30" rx="12" fill="%23d1d5db"/></svg>';

  const resolvePhoto = (photo?: string) => {
    if (!photo) return PLACEHOLDER;
    const src = photo.trim();
    if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) return src;
    return `${API_BASE}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not provided';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const calculateAge = (dateString: string) => {
    if (!dateString) return '';
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return ` (${age} years)`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-t-2xl shadow-lg p-6 border-b-4 border-red-500">
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-500 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">EMERGENCY INFORMATION</h1>
            </div>
            <p className="text-center text-gray-600">
              This information is provided for emergency responders and medical personnel
            </p>
          </div>

          {/* Main Content */}
          <div className="bg-white shadow-lg">
            {/* Photo and Basic Info */}
            <div className="p-6 bg-gradient-to-r from-orange-500 to-red-500 text-white">
              <div className="flex items-center space-x-6">
                <img
                  src={resolvePhoto(emergencyData.photo)}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }}
                  alt={emergencyData.fullName || 'Emergency profile'}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
                <div className="flex-1">
                  <h2 className="text-3xl font-bold">{emergencyData.fullName || 'Name not provided'}</h2>
                  <div className="mt-2 space-y-1">
                    {emergencyData.dateOfBirth && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>DOB: {formatDate(emergencyData.dateOfBirth)}{calculateAge(emergencyData.dateOfBirth)}</span>
                      </div>
                    )}
                    {emergencyData.phoneNumber && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2" />
                        <span>{emergencyData.phoneNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
                {emergencyData.bloodType && (
                  <div className="text-center bg-white/20 rounded-lg p-4">
                    <Droplets className="h-6 w-6 mx-auto mb-1" />
                    <div className="text-2xl font-bold">{emergencyData.bloodType}</div>
                    <div className="text-sm opacity-90">Blood Type</div>
                  </div>
                )}
              </div>
            </div>

            {/* Emergency Contact */}
            {emergencyData.emergencyContact && (
              <div className="p-6 bg-red-50 border-l-4 border-red-500">
                <h3 className="text-lg font-semibold text-red-800 mb-2 flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  Emergency Contact
                </h3>
                <p className="text-red-700 text-lg font-medium">{emergencyData.emergencyContact}</p>
              </div>
            )}

            {/* Address */}
            {emergencyData.address && (
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                  <Home className="h-5 w-5 mr-2 text-blue-500" />
                  Address
                </h3>
                <p className="text-gray-700">{emergencyData.address}</p>
              </div>
            )}

            {/* Medical Information Grid */}
            <div className="p-6 grid md:grid-cols-3 gap-6">
              {/* Allergies */}
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2 flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Allergies
                </h3>
                <p className="text-yellow-700">
                  {emergencyData.allergies || 'No known allergies'}
                </p>
              </div>

              {/* Medications */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-2 flex items-center">
                  <Pill className="h-5 w-5 mr-2" />
                  Medications
                </h3>
                <p className="text-blue-700">
                  {emergencyData.medications || 'No current medications'}
                </p>
              </div>

              {/* Medical Conditions */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h3 className="text-lg font-semibold text-purple-800 mb-2 flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Medical Conditions
                </h3>
                <p className="text-purple-700">
                  {emergencyData.medicalConditions || 'No known conditions'}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 rounded-b-2xl text-center">
              <p className="text-sm text-gray-600">
                Generated on: {new Date().toLocaleDateString('en-IN')} at {new Date().toLocaleTimeString('en-IN')}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                For emergency assistance, call 108 (Medical) | 100 (Police) | 101 (Fire)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}