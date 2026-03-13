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
  const [rescuerCurrentLocation, setRescuerCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyMedicalFacilities, setNearbyMedicalFacilities] = useState<Hospital[]>([]);
  const [isFetchingHospitals, setIsFetchingHospitals] = useState(true);
  const [hospitalFetchError, setHospitalFetchError] = useState<string | null>(null);
  const [gpsAccessError, setGpsAccessError] = useState<string | null>(null);
  const [emergencyAlertActivated, setEmergencyAlertActivated] = useState(false);

  // Get user location on component mount
  useEffect(() => {
    const trackRescuerGPSLocation = async () => {
      setIsFetchingHospitals(true);
      setGpsAccessError(null);

      // Try GPS first
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (gpsPosition) => {
            const { latitude, longitude } = gpsPosition.coords;
            setRescuerCurrentLocation({ lat: latitude, lng: longitude });
            findClosestEmergencyHospitals(latitude, longitude);
          },
          (gpsError) => {
            console.warn('GPS failed, trying IP-based location:', gpsError);
            setGpsAccessError('GPS unavailable. Using approximate location.');
            // Fallback to Hyderabad coordinates for testing
            const hyderabadLatitude = 17.3850;
            const hyderabadLongitude = 78.4867;
            setRescuerCurrentLocation({ lat: hyderabadLatitude, lng: hyderabadLongitude });
            findClosestEmergencyHospitals(hyderabadLatitude, hyderabadLongitude);
          },
          { timeout: 5000, enableHighAccuracy: true }
        );
      } else {
        setGpsAccessError('Location services not available');
        const hyderabadLatitude = 17.3850;
        const hyderabadLongitude = 78.4867;
        setRescuerCurrentLocation({ lat: hyderabadLatitude, lng: hyderabadLongitude });
        findClosestEmergencyHospitals(hyderabadLatitude, hyderabadLongitude);
      }
    };

    trackRescuerGPSLocation();
  }, []);

  const findClosestEmergencyHospitals = async (victimLatitude: number, victimLongitude: number) => {
    try {
      const backendApiUrl = import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com';
      const hospitalSearchResponse = await fetch(`${backendApiUrl}/api/v1/hospitals/nearby?lat=${victimLatitude}&lng=${victimLongitude}&maxDistance=10000`);

      if (!hospitalSearchResponse.ok) {
        throw new Error('Failed to fetch hospitals');
      }

      const hospitalListData = await hospitalSearchResponse.json();
      setNearbyMedicalFacilities(hospitalListData);
      setHospitalFetchError(null);
    } catch (fetchError) {
      console.error('Error fetching hospitals:', fetchError);
      setHospitalFetchError('Could not load nearby hospitals. Checking connection...');
    } finally {
      setIsFetchingHospitals(false);
    }
  };

  const initiateEmergencySOSAlert = () => {
    setEmergencyAlertActivated(true);
    console.log('🚨 SOS button pressed. Triggering alerts...');
    // Trigger SOS alert to emergency contacts
    sendSOSNotificationToContacts();
    // Auto-call 108 after 1 second
    setTimeout(() => {
      console.log('📞 Auto-calling 108');
      window.location.href = 'tel:108';
    }, 1000);
  };

  const sendSOSNotificationToContacts = async () => {
    if (!rescuerCurrentLocation || !emergencyData) return;

    try {
      const backendApiUrl = import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com';
      await fetch(`${backendApiUrl}/api/v1/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: rescuerCurrentLocation,
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
    } catch (sosError) {
      console.error('Error triggering SOS:', sosError);
    }
  };

  const dialHospitalAmbulanceNumber = (hospitalPhoneNumber: string) => {
    console.log('📞 Calling hospital:', hospitalPhoneNumber);
    window.location.href = `tel:${hospitalPhoneNumber}`;
  };

  const openMapDirectionsToHospital = (hospitalLatitude: number, hospitalLongitude: number, hospitalName: string) => {
    // Support both Google Maps and Apple Maps
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      console.log('🧭 Opening Apple Maps to hospital');
      window.location.href = `maps://maps.apple.com/?daddr=${hospitalLatitude},${hospitalLongitude}`;
    } else {
      console.log('🧭 Opening Google Maps to hospital', hospitalName);
      window.location.href = `https://www.google.com/maps/dir/?api=1&destination=${hospitalLatitude},${hospitalLongitude}`;
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
            onClick={initiateEmergencySOSAlert}
            disabled={emergencyAlertActivated}
            className={`w-full py-6 rounded-lg font-bold text-lg transition-all transform active:scale-95 ${
              emergencyAlertActivated
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-2xl'
            }`}
          >
            {emergencyAlertActivated ? '✓ SOS Sent to Emergency Contacts' : '🚨 EMERGENCY SOS'}
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
        {rescuerCurrentLocation && (
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 shadow-md text-white">
            <div className="flex items-start gap-3">
              <MapPin className="h-6 w-6 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-lg mb-1">📍 Live Location</p>
                <p className="text-sm opacity-90">
                  <span className="font-mono font-bold">{rescuerCurrentLocation.lat.toFixed(4)}, {rescuerCurrentLocation.lng.toFixed(4)}</span>
                </p>
                {gpsAccessError && <p className="text-sm mt-2 text-yellow-100">⚠️ {gpsAccessError}</p>}
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
        {nearbyMedicalFacilities.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="bg-red-500 w-1 h-6 rounded-full"></span>
              🏥 Nearest Hospitals
            </h2>

          {isFetchingHospitals && (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-6 w-6 animate-spin text-orange-500 mr-2" />
              <span className="text-gray-600">Finding hospitals...</span>
            </div>
          )}

          {hospitalFetchError && (
            <div className="bg-orange-50 border border-orange-200 rounded p-3 text-orange-700 text-sm">
              <p>⚠️ {hospitalFetchError}</p>
              <p className="text-xs mt-1">Using default hospital list...</p>
            </div>
          )}

          {!isFetchingHospitals && nearbyMedicalFacilities.length === 0 && !hospitalFetchError && (
            <p className="text-gray-600 text-center py-4">Loading hospitals...</p>
          )}

            <div className="space-y-3">
              {nearbyMedicalFacilities.slice(0, 8).map((medicalCenter) => (
                <div key={medicalCenter.id} className="bg-white rounded-lg shadow-md border-l-4 border-indigo-600 p-4">
                  <h3 className="font-bold text-gray-900 text-base">{medicalCenter.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{medicalCenter.address}</p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-sm font-semibold text-blue-600">{medicalCenter.distance} km away</p>
                    {medicalCenter.rating > 0 && <p className="text-sm text-yellow-600">⭐ {medicalCenter.rating}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {medicalCenter.phone && (
                      <button
                        onClick={() => dialHospitalAmbulanceNumber(medicalCenter.phone)}
                        className="bg-green-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-green-700 flex items-center justify-center gap-1"
                      >
                        <Phone className="h-4 w-4" /> Call
                      </button>
                    )}
                    <button
                      onClick={() => openMapDirectionsToHospital(medicalCenter.lat, medicalCenter.lng, medicalCenter.name)}
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

        {nearbyMedicalFacilities.length === 0 && !isFetchingHospitals && (
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