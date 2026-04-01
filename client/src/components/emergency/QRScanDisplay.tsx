import React, { useEffect, useState, useCallback } from 'react';
import { MapPin, Phone, Navigation, AlertCircle, Loader, Droplet, Pill, Heart, Users, Copy } from 'lucide-react';
import type { EmergencyInfo } from '../../types/emergency';
import { getOrCreateDeviceId, formatDeviceIdForDisplay } from '../../utils/deviceId';

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
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const [isTriggeringSos, setIsTriggeringSos] = useState(false);
  const [sosAlertId, setSosAlertId] = useState<string | null>(null);
  const [sosSuccessMessage, setSosSuccessMessage] = useState<string | null>(null);
  const [sosErrorMessage, setSosErrorMessage] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');
  const [deviceIdCopied, setDeviceIdCopied] = useState(false);

  // Get user location on component mount
  useEffect(() => {
    // Initialize device ID
    const id = getOrCreateDeviceId();
    setDeviceId(id);
    console.log('📱 Device ID initialized:', id);

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
            console.warn('GPS failed:', gpsError);
            setRescuerCurrentLocation(null);
            setGpsAccessError('Unable to get accurate GPS. Enable precise location and try again.');
            setIsFetchingHospitals(false);
          },
          { timeout: 30000, enableHighAccuracy: true, maximumAge: 0 }
        );
      } else {
        setGpsAccessError('Location services not available');
        setRescuerCurrentLocation(null);
        setIsFetchingHospitals(false);
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

  const startSosCountdown = () => {
    console.log('🔴 [QRScanDisplay] SOS button clicked! isTriggeringSos:', isTriggeringSos);
    if (isTriggeringSos) {
      console.log('⚠️ [QRScanDisplay] Already triggering, ignoring click');
      return;
    }
    console.log('✅ [QRScanDisplay] Starting 10-second countdown...');
    setSosErrorMessage(null);
    setSosSuccessMessage(null);
    setSosAlertId(null);
    setSosCountdown(10);
  };

  const cancelSosCountdown = () => {
    console.log('❌ [QRScanDisplay] Countdown cancelled');
    setSosCountdown(null);
    setSosErrorMessage(null);
  };

  const sendSOSNotificationToContacts = useCallback(async () => {
    if (!rescuerCurrentLocation || !emergencyData || !deviceId) {
      console.error('❌ [QRScanDisplay] Location, emergency details, or device ID unavailable');
      setSosErrorMessage('Location or emergency details unavailable. Please try again.');
      return;
    }

    setIsTriggeringSos(true);
    setSosErrorMessage(null);

    try {
      const backendApiUrl = import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com';
      console.log('🚨 [QRScanDisplay] Sending SOS with device ID:', deviceId);
      const response = await fetch(`${backendApiUrl}/api/v1/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          victimName: emergencyData.fullName,
          victimPhone: emergencyData.phoneNumber || '',
          victimBloodType: emergencyData.bloodType || '',
          victimAllergies: emergencyData.allergies || '',
          victimMedications: emergencyData.medications || '',
          victimEmergencyContacts: emergencyData.emergencyContacts || [],
          responderDeviceId: deviceId,
          responderLocation: {
            lat: rescuerCurrentLocation.lat,
            lng: rescuerCurrentLocation.lng,
          },
          responderLocationAccuracy: null,
          responderLocationMeta: {
            altitude: null,
            heading: null,
            speed: null,
            capturedAt: new Date().toISOString(),
          },
          responderUserAgent: navigator.userAgent,
          triggeredAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `HTTP ${response.status}: Failed to trigger SOS`);
      }

      const alert = await response.json();
      const alertId = alert?._id as string | undefined;
      setSosAlertId(alertId || null);
      setSosSuccessMessage('🚨 SOS alert sent! Alert has been logged with your device ID for evidence.');
      console.log('✅ [QRScanDisplay] SOS alert created:', alertId);

      setTimeout(() => {
        console.log('📞 [QRScanDisplay] Auto-calling 108');
        window.location.href = 'tel:108';
      }, 1000);
    } catch (sosError) {
      console.error('❌ [QRScanDisplay] Error triggering SOS:', sosError);
      const message = sosError instanceof Error ? sosError.message : 'Failed to trigger SOS alert';
      setSosErrorMessage(message);
    } finally {
      setIsTriggeringSos(false);
    }
  }, [rescuerCurrentLocation, emergencyData, deviceId]);

  useEffect(() => {
    console.log('⏲️ [QRScanDisplay] Countdown effect running. sosCountdown:', sosCountdown, 'isTriggeringSos:', isTriggeringSos);
    
    if (sosCountdown === null || isTriggeringSos) {
      console.log('⏸️ [QRScanDisplay] Skipping countdown (null or triggering)');
      return;
    }

    if (sosCountdown === 0) {
      console.log('⏰ [QRScanDisplay] Countdown reached zero, triggering SOS...');
      setSosCountdown(null);
      sendSOSNotificationToContacts();
      return;
    }

    console.log('⏱️ [QRScanDisplay] Setting timer for countdown:', sosCountdown);
    const timer = window.setTimeout(() => {
      setSosCountdown((prev) => {
        const newValue = prev === null ? null : prev - 1;
        console.log('📉 [QRScanDisplay] Countdown updated:', prev, '→', newValue);
        return newValue;
      });
    }, 1000);

    return () => {
      console.log('🧹 [QRScanDisplay] Cleaning up timer');
      window.clearTimeout(timer);
    };
  }, [sosCountdown, isTriggeringSos, sendSOSNotificationToContacts]);

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

  const copyDeviceIdToClipboard = () => {
    navigator.clipboard.writeText(deviceId);
    setDeviceIdCopied(true);
    setTimeout(() => setDeviceIdCopied(false), 2000);
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
          {deviceId && (
            <div className="mb-3 bg-blue-50 border border-blue-300 rounded-md p-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-600 mb-1">📱 Your Device ID (Emergency Evidence)</p>
                <p className="text-sm font-mono text-blue-900">{formatDeviceIdForDisplay(deviceId)}</p>
                <p className="text-xs text-blue-600 mt-1">This uniquely identifies your device for police evidence</p>
              </div>
              <button
                onClick={copyDeviceIdToClipboard}
                className="ml-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                title="Copy full device ID"
              >
                <Copy className="h-4 w-4" />
              </button>
              {deviceIdCopied && <span className="ml-2 text-xs text-green-600 font-semibold">✓ Copied!</span>}
            </div>
          )}
          {sosCountdown === null ? (
            <button
              onClick={startSosCountdown}
              disabled={isTriggeringSos}
              className="w-full py-6 rounded-lg font-bold text-lg transition-all transform active:scale-95 bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isTriggeringSos ? '🚨 Sending SOS Alert...' : '🚨 EMERGENCY SOS'}
            </button>
          ) : (
            <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-red-700">
                Warning: Triggering false SOS is a criminal offence. Alert will be sent in {sosCountdown} seconds.
              </p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-2xl font-extrabold text-red-700 tabular-nums">{sosCountdown}</p>
                <button
                  type="button"
                  onClick={cancelSosCountdown}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {sosSuccessMessage && (
            <p className="mt-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              {sosSuccessMessage}
            </p>
          )}
          {sosErrorMessage && (
            <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {sosErrorMessage}
            </p>
          )}
          {sosAlertId && <p className="mt-2 text-center text-xs font-medium text-gray-600">Alert ID: {sosAlertId}</p>}
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
                {emergencyData.phoneNumber && <p className="text-sm text-gray-700 mt-1">Phone: {emergencyData.phoneNumber}</p>}
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

        {/* Medical Information Grid */}
        {emergencyData && (
          <div className="grid grid-cols-2 gap-3">
            {emergencyData.email && (
              <div className="bg-indigo-50 border-2 border-indigo-300 rounded-lg p-3">
                <p className="text-xs font-bold text-indigo-600 mb-1">Email</p>
                <p className="text-sm font-bold text-indigo-700 break-all">{emergencyData.email}</p>
              </div>
            )}
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

          {hospitalFetchError && (
            <div className="bg-orange-50 border border-orange-200 rounded p-3 text-orange-700 text-sm">
              <p>⚠️ {hospitalFetchError}</p>
              <p className="text-xs mt-1">Using default hospital list...</p>
            </div>
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

        <div className="text-center py-6 border-t border-gray-200">
          <p className="font-bold text-gray-900">INcase - Emergency Response System</p>
          <p className="text-sm text-gray-600">All data secured • Golden-hour medical coordination</p>
        </div>
      </div>
    </div>
  );
}