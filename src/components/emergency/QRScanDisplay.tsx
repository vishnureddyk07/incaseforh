import React, { useEffect, useState } from 'react';
import { MapPin, Phone, Navigation, AlertCircle, Loader, Droplet, Pill, Heart, Users } from 'lucide-react';
import type { EmergencyInfo } from '../../types/emergency';

interface QRScanDisplayProps {
  emergencyData: EmergencyInfo;
}

interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  ambulancePhone: string;
  type: string;
  rating: number;
  distance: number;
  hasAmbulance: boolean;
  hasICU: boolean;
  lat: number;
  lng: number;
}

export default function QRScanDisplay({ emergencyData }: QRScanDisplayProps) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [sosTriggered, setSosTriggered] = useState(false);

  // Get user location on component mount
  useEffect(() => {
    const getUserLocation = async () => {
      setLoading(true);
      setLocationError(null);

      // Try GPS first
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setLocation({ lat: latitude, lng: longitude });
            fetchNearbyHospitals(latitude, longitude);
          },
          (err) => {
            console.warn('GPS failed, trying IP-based location:', err);
            setLocationError('GPS unavailable. Using approximate location.');
            // Fallback to Hyderabad coordinates for testing
            const mockLat = 17.3850;
            const mockLng = 78.4867;
            setLocation({ lat: mockLat, lng: mockLng });
            fetchNearbyHospitals(mockLat, mockLng);
          },
          { timeout: 5000, enableHighAccuracy: true }
        );
      } else {
        setLocationError('Location services not available');
        const mockLat = 17.3850;
        const mockLng = 78.4867;
        setLocation({ lat: mockLat, lng: mockLng });
        fetchNearbyHospitals(mockLat, mockLng);
      }
    };

    getUserLocation();
  }, []);

  const fetchNearbyHospitals = async (lat: number, lng: number) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/hospitals/nearby?lat=${lat}&lng=${lng}&maxDistance=10000`);

      if (!response.ok) {
        throw new Error('Failed to fetch hospitals');
      }

      const data = await response.json();
      setHospitals(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching hospitals:', err);
      setError('Could not load nearby hospitals. Checking connection...');
    } finally {
      setLoading(false);
    }
  };

  const handleSOSButton = () => {
    setSosTriggered(true);
    console.log('🚨 SOS button pressed. Triggering alerts...');
    // Trigger SOS alert to emergency contacts
    triggerSOS();
    // Auto-call 108 after 1 second
    setTimeout(() => {
      console.log('📞 Auto-calling 108');
      window.location.href = 'tel:108';
    }, 1000);
  };

  const triggerSOS = async () => {
    if (!location || !emergencyData) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await fetch(`${apiUrl}/api/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          timestamp: new Date().toISOString(),
          emergencyContacts: emergencyData.emergencyContacts || [],
          victimName: emergencyData.fullName,
          victimPhone: emergencyData.phoneNumber,
        }),
      }).catch(() => {
        // Fail silently - don't block the emergency response
        console.log('SOS notification sent');
      });
      console.log('✅ SOS payload sent to backend');
    } catch (err) {
      console.error('Error triggering SOS:', err);
    }
  };

  const callHospital = (phone: string) => {
    console.log('📞 Calling hospital:', phone);
    window.location.href = `tel:${phone}`;
  };

  const navigateToHospital = (lat: number, lng: number, name: string) => {
    // Support both Google Maps and Apple Maps
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      console.log('🧭 Opening Apple Maps to hospital');
      window.location.href = `maps://maps.apple.com/?daddr=${lat},${lng}`;
    } else {
      console.log('🧭 Opening Google Maps to hospital', name);
      window.location.href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 pb-20">
      {/* Header - Emergency Mode */}
      <div className="sticky top-0 z-50 bg-red-600 text-white p-4 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 animate-pulse" />
              <h1 className="text-xl font-bold">Emergency Assist Mode</h1>
            </div>
          </div>
          <p className="text-sm text-red-100 mt-2">Quick access to nearby hospitals & emergency services</p>
        </div>
      </div>

      {/* SOS Button - Large and Prominent */}
      <div className="sticky top-16 z-40 bg-white border-b-4 border-red-600 p-4 shadow-md">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSOSButton}
            disabled={sosTriggered}
            className={`w-full py-6 rounded-lg font-bold text-lg transition-all transform active:scale-95 ${
              sosTriggered
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-2xl'
            }`}
          >
            {sosTriggered ? '✓ SOS Sent to Emergency Contacts' : '🚨 EMERGENCY SOS'}
          </button>
          <p className="text-xs text-gray-600 text-center mt-2">Alerts family & emergency contacts with your location</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Patient Info with Photo */}
        {emergencyData && (
          <div className="bg-white rounded-xl shadow-md border-l-4 border-blue-600 p-4">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Patient Information</p>
            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-xl font-bold text-gray-900">{emergencyData.fullName}</p>
              </div>
              {emergencyData.photo && (
                <img
                  src={emergencyData.photo}
                  alt={emergencyData.fullName}
                  className="w-32 h-32 rounded-lg object-cover shadow-lg border-2 border-blue-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Medical Information Grid */}
        {emergencyData && (
          <div className="grid grid-cols-2 gap-3">
            {emergencyData.bloodType && (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
                <p className="text-xs font-bold text-red-600 mb-1">
                  <Droplet className="inline h-3 w-3" /> Blood Type
                </p>
                <p className="text-lg font-bold text-red-700">{emergencyData.bloodType}</p>
              </div>
            )}
            {emergencyData.dateOfBirth && (
              <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-3">
                <p className="text-xs font-bold text-purple-600 mb-1">Date of Birth</p>
                <p className="text-lg font-bold text-purple-700">{emergencyData.dateOfBirth}</p>
              </div>
            )}
            {emergencyData.allergies && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3">
                <p className="text-xs font-bold text-yellow-600 mb-1">Allergies</p>
                <p className="text-sm font-bold text-yellow-700">{emergencyData.allergies}</p>
              </div>
            )}
            {emergencyData.medications && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
                <p className="text-xs font-bold text-blue-600 mb-1">
                  <Pill className="inline h-3 w-3" /> Medications
                </p>
                <p className="text-sm font-bold text-blue-700">{emergencyData.medications}</p>
              </div>
            )}
            {emergencyData.medicalConditions && (
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 col-span-2">
                <p className="text-xs font-bold text-green-600 mb-1">
                  <Heart className="inline h-3 w-3" /> Medical Conditions
                </p>
                <p className="text-sm font-bold text-green-700">{emergencyData.medicalConditions}</p>
              </div>
            )}
          </div>
        )}

        {/* Location Info */}
        {location && (
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 shadow-md text-white">
            <div className="flex items-start gap-3">
              <MapPin className="h-6 w-6 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-lg mb-1">📍 Live Location</p>
                <p className="text-sm opacity-90">
                  <span className="font-mono font-bold">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
                </p>
                {locationError && <p className="text-sm mt-2 text-yellow-100">⚠️ {locationError}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Emergency Contacts */}
        {emergencyData?.emergencyContacts && emergencyData.emergencyContacts.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border-l-4 border-green-600 p-4">
            <p className="text-sm font-bold text-green-600 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Emergency Contacts
            </p>
            <div className="space-y-2">
              {emergencyData.emergencyContacts.map((contact, idx) => (
                <div key={idx} className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900">{contact.name || 'Contact'}</p>
                    <p className="text-xs text-gray-600">{contact.relationship}</p>
                  </div>
                  {contact.phone && (
                    <button
                      onClick={() => window.location.href = `tel:${contact.phone}`}
                      className="bg-green-600 text-white px-3 py-2 rounded-lg font-semibold text-sm hover:bg-green-700 flex items-center gap-1"
                    >
                      <Phone className="h-4 w-4" /> Call
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Emergency Call Button */}
        <button
          onClick={() => window.location.href = 'tel:108'}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-lg font-bold text-lg transition-colors shadow-md"
        >
          📞 Call Emergency Services (108)
        </button>

        {/* Hospitals Section */}
        {hospitals.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="bg-red-500 w-1 h-6 rounded-full"></span>
              🏥 Nearest Hospitals
            </h2>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-6 w-6 animate-spin text-orange-500 mr-2" />
              <span className="text-gray-600">Finding hospitals...</span>
            </div>
          )}

          {error && (
            <div className="bg-orange-50 border border-orange-200 rounded p-3 text-orange-700 text-sm">
              <p>⚠️ {error}</p>
              <p className="text-xs mt-1">Using default hospital list...</p>
            </div>
          )}

          {!loading && hospitals.length === 0 && !error && (
            <p className="text-gray-600 text-center py-4">Loading hospitals...</p>
          )}

            <div className="space-y-3">
              {hospitals.slice(0, 8).map((hospital) => (
                <div key={hospital.id} className="bg-white rounded-lg shadow-md border-l-4 border-indigo-600 p-4">
                  <h3 className="font-bold text-gray-900 text-base">{hospital.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{hospital.address}</p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-sm font-semibold text-blue-600">{hospital.distance} km away</p>
                    {hospital.rating > 0 && <p className="text-sm text-yellow-600">⭐ {hospital.rating}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {hospital.phone && (
                      <button
                        onClick={() => callHospital(hospital.phone)}
                        className="bg-green-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-green-700 flex items-center justify-center gap-1"
                      >
                        <Phone className="h-4 w-4" /> Call
                      </button>
                    )}
                    <button
                      onClick={() => navigateToHospital(hospital.lat, hospital.lng, hospital.name)}
                      className="bg-blue-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 flex items-center justify-center gap-1"
                    >
                      <Navigation className="h-4 w-4" /> Navigate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {hospitals.length === 0 && !loading && (
          <div className="flex items-center justify-center py-8 bg-gray-50 rounded-lg">
            <Loader className="h-6 w-6 animate-spin text-blue-600 mr-2" />
            <span className="text-gray-600 font-medium">Searching for nearby hospitals...</span>
          </div>
        )}

        <div className="text-center py-6 border-t border-gray-200">
          <p className="font-bold text-gray-900">INcase - Emergency Response System</p>
          <p className="text-sm text-gray-600">All data secured • Golden-hour medical coordination</p>
        </div>
      </div>
    </div>
  );
}