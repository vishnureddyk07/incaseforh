import { useEffect, useState, useCallback } from 'react';
import { MapPin, Phone, Navigation, AlertCircle, Loader, Droplet, Pill, Heart, Users, Copy } from 'lucide-react';
import { getOrCreateDeviceId, formatDeviceIdForDisplay } from '../../utils/deviceId';

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

interface EmergencyAssistPageProps {
  emergencyData?: {
    fullName?: string;
    photo?: string;
    bloodType?: string;
    dateOfBirth?: string;
    allergies?: string;
    medications?: string;
    medicalConditions?: string;
    bloodTypeReport?: string;
    prescriptionOrDischargeReport?: string;
    surgicalInfoReport?: string;
    phoneNumber?: string;
    emergencyContacts?: Array<{ name: string; phone: string; relationship?: string }>;
  };
}

export default function EmergencyAssistPage({ emergencyData }: EmergencyAssistPageProps) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const [isTriggeringSos, setIsTriggeringSos] = useState(false);
  const [sosAlertId, setSosAlertId] = useState<string | null>(null);
  const [sosSuccessMessage, setSosSuccessMessage] = useState<string | null>(null);
  const [sosErrorMessage, setSosErrorMessage] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');
  const [deviceIdCopied, setDeviceIdCopied] = useState(false);
  const fallbackPhotoDataUrl =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"%3E%3Crect width="320" height="320" fill="%23e5e7eb"/%3E%3Ccircle cx="160" cy="120" r="56" fill="%239ca3af"/%3E%3Crect x="62" y="205" width="196" height="86" rx="43" fill="%239ca3af"/%3E%3C/svg%3E';

  // Get user location on component mount
  useEffect(() => {
    // Initialize device ID
    const id = getOrCreateDeviceId();
    setDeviceId(id);
    console.log('📱 Device ID initialized:', id);

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
            console.warn('GPS failed:', err);
            setLocation(null);
            setLocationError('Unable to get accurate GPS. Enable precise location and try again.');
            setLoading(false);
          },
          { timeout: 30000, enableHighAccuracy: true, maximumAge: 0 }
        );
      } else {
        setLocationError('Location services not available');
        setLocation(null);
        setLoading(false);
      }
    };

    getUserLocation();
  }, []);

  const fetchNearbyHospitals = async (lat: number, lng: number) => {
    console.log('🏥 Fetching hospitals near:', lat, lng);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com';
      const response = await fetch(`${apiUrl}/api/v1/hospitals/nearby?lat=${lat}&lng=${lng}&maxDistance=10000`);

      if (!response.ok) {
        throw new Error('Failed to fetch hospitals');
      }

      const data = await response.json();
      console.log('✅ Found', data.length, 'hospitals from backend');
      setHospitals(data.slice(0, 8));
      setError(null);
    } catch (err) {
      console.error('❌ Error fetching hospitals:', err);
      setError('Could not load nearby hospitals. Checking connection...');
    } finally {
      setLoading(false);
    }
  };

  const startSosCountdown = () => {
    console.log('🔴 [AssistPage] SOS button clicked! isTriggeringSos:', isTriggeringSos);
    if (isTriggeringSos) {
      console.log('⚠️ [AssistPage] Already triggering, ignoring click');
      return;
    }
    console.log('✅ [AssistPage] Starting 10-second countdown...');
    setSosErrorMessage(null);
    setSosSuccessMessage(null);
    setSosAlertId(null);
    setSosCountdown(10);
  };

  const cancelSosCountdown = () => {
    console.log('❌ [AssistPage] Countdown cancelled');
    setSosCountdown(null);
    setSosErrorMessage(null);
  };

  const triggerSOS = useCallback(async () => {
    if (!location || !deviceId) {
      console.error('❌ [AssistPage] Location or device ID is unavailable');
      setSosErrorMessage('Location is unavailable. Please enable location access and try again.');
      return;
    }

    setIsTriggeringSos(true);
    setSosErrorMessage(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com';
      console.log('🚨 [AssistPage] Starting SOS trigger with device ID:', deviceId);
      const response = await fetch(`${apiUrl}/api/v1/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          victimName: emergencyData?.fullName || 'Unknown',
          victimPhone: emergencyData?.phoneNumber || '',
          victimBloodType: emergencyData?.bloodType || '',
          victimAllergies: emergencyData?.allergies || '',
          victimMedications: emergencyData?.medications || '',
          victimEmergencyContacts: emergencyData?.emergencyContacts || [],
          responderDeviceId: deviceId,
          responderLocation: {
            lat: location.lat,
            lng: location.lng,
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
      console.log('✅ [AssistPage] SOS alert created:', alertId);

      // Auto-call emergency number after successful SOS trigger.
      setTimeout(() => {
        console.log('📞 [AssistPage] Auto-calling 108');
        window.location.href = 'tel:108';
      }, 500);
    } catch (err) {
      console.error('❌ [AssistPage] Error triggering SOS:', err);
      const message = err instanceof Error ? err.message : 'Failed to trigger SOS alert';
      setSosErrorMessage(message);
    } finally {
      setIsTriggeringSos(false);
    }
  }, [location, emergencyData, deviceId]);

  useEffect(() => {
    console.log('⏲️ [AssistPage] Countdown effect running. sosCountdown:', sosCountdown, 'isTriggeringSos:', isTriggeringSos);
    
    if (sosCountdown === null || isTriggeringSos) {
      console.log('⏸️ [AssistPage] Skipping countdown (null or triggering)');
      return;
    }

    if (sosCountdown === 0) {
      console.log('⏰ [AssistPage] Countdown reached zero, triggering SOS...');
      setSosCountdown(null);
      triggerSOS();
      return;
    }

    console.log('⏱️ [AssistPage] Setting timer for countdown:', sosCountdown);
    const timer = window.setTimeout(() => {
      setSosCountdown((prev) => {
        const newValue = prev === null ? null : prev - 1;
        console.log('📉 [AssistPage] Countdown updated:', prev, '→', newValue);
        return newValue;
      });
    }, 1000);

    return () => {
      console.log('🧹 [AssistPage] Cleaning up timer');
      window.clearTimeout(timer);
    };
  }, [sosCountdown, isTriggeringSos, triggerSOS]);

  const callHospital = (phone: string) => {
    console.log('📞 [AssistPage] Calling hospital', phone);
    window.location.href = `tel:${phone}`;
  };

  const navigateToHospital = (lat: number, lng: number, name: string) => {
    // Support both Google Maps and Apple Maps
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      console.log('🧭 [AssistPage] Opening Apple Maps');
      window.location.href = `maps://maps.apple.com/?daddr=${lat},${lng}`;
    } else {
      console.log('🧭 [AssistPage] Opening Google Maps', name);
      window.location.href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
  };

  const copyDeviceIdToClipboard = () => {
    navigator.clipboard.writeText(deviceId);
    setDeviceIdCopied(true);
    setTimeout(() => setDeviceIdCopied(false), 2000);
  };

  const uploadedMedicalDocuments = [
    { label: 'Blood Group Result', url: emergencyData?.bloodTypeReport },
    { label: 'Prescription / Discharge Report', url: emergencyData?.prescriptionOrDischargeReport },
    { label: 'Surgical Info / Report', url: emergencyData?.surgicalInfoReport },
  ].filter((doc) => typeof doc.url === 'string' && doc.url.length > 0);

  return (
    <div className="min-h-screen gradient-primary pb-20">
      {/* Header - Emergency Mode */}
      <div className="sticky top-0 z-50 gradient-primary-dark text-white p-4 shadow-lg border-b-4 border-primary-700">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertCircle className="h-7 w-7 animate-pulse" />
            Emergency Assistance
          </h1>
          <p className="text-primary-100 text-sm mt-1">Help is on the way</p>
        </div>
      </div>

      {/* SOS Button */}
      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur p-3 shadow-lg border-b-2 border-primary-500">
        <div className="max-w-4xl mx-auto">
          {deviceId && (
            <div className="mb-3 bg-primary-50 border border-primary-300 rounded-md p-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-primary-600 mb-1">📱 Your Device ID (Emergency Evidence)</p>
                <p className="text-sm font-mono text-primary-900">{formatDeviceIdForDisplay(deviceId)}</p>
                <p className="text-xs text-primary-600 mt-1">This uniquely identifies your device for police evidence</p>
              </div>
              <button
                onClick={copyDeviceIdToClipboard}
                className="ml-2 p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
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
              className="w-full py-4 rounded-lg font-bold text-lg transition-all transform active:scale-95 shadow-lg bg-primary-600 text-white hover:bg-primary-700 hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isTriggeringSos ? '🚨 Sending SOS Alert...' : '🚨 EMERGENCY SOS'}
            </button>
          ) : (
            <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-red-700">
                Warning: Triggering false SOS is a criminal offence. Alert will be sent to police and ambulance in {sosCountdown} seconds.
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
          {sosAlertId && (
            <p className="mt-2 text-center text-xs font-medium text-neutral-600">Alert ID: {sosAlertId}</p>
          )}
            <p className="text-xs text-neutral-600 text-center mt-2 font-medium">Notifies family & emergency services with location</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Photo */}
        {emergencyData && (
          <div className="bg-white rounded-xl shadow-md border border-neutral-200 p-4">
            <p className="text-sm font-bold text-neutral-700 mb-3">Photo</p>
            <img
              src={emergencyData.photo || fallbackPhotoDataUrl}
              alt={emergencyData.fullName || 'Emergency profile photo'}
              className="w-40 h-40 rounded-lg object-cover shadow-lg border-2 border-primary-200"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = fallbackPhotoDataUrl;
              }}
            />
          </div>
        )}

        {/* Name */}
        {emergencyData && (
          <div className="bg-white rounded-xl shadow-md border-l-4 border-primary-600 p-4">
            <p className="text-sm font-bold text-primary-700">Name</p>
            <p className="text-xl font-bold text-neutral-900 mt-1">{emergencyData.fullName || 'Emergency Contact'}</p>
          </div>
        )}

        {/* Phone */}
        {emergencyData?.phoneNumber && (
          <div className="bg-white rounded-xl shadow-md border-l-4 border-primary-600 p-4">
            <p className="text-sm font-bold text-primary-700">Phone Number</p>
            <p className="text-lg font-semibold text-neutral-900 mt-1">{emergencyData.phoneNumber}</p>
          </div>
        )}

        {/* Emergency Contacts */}
        {emergencyData?.emergencyContacts && emergencyData.emergencyContacts.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border-l-4 border-success-600 p-4">
            <p className="text-sm font-bold text-green-600 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Emergency Contacts
            </p>
            <div className="space-y-2">
              {emergencyData.emergencyContacts.map((contact, idx) => (
                <div key={idx} className="flex items-center justify-between bg-success-50 p-3 rounded-lg">
                  <div>
                    <p className="font-semibold text-neutral-900">{contact.name || 'Contact'}</p>
                    <p className="text-xs text-neutral-600">{contact.relationship}</p>
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

        {/* Blood Group */}
        {emergencyData.bloodType && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
            <p className="text-xs font-bold text-red-600 mb-1">
              <Droplet className="inline h-3 w-3" /> Blood Group
            </p>
            <p className="text-lg font-bold text-red-700">{emergencyData.bloodType}</p>
          </div>
        )}

        {uploadedMedicalDocuments.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border border-neutral-200 p-4">
            <p className="text-sm font-bold text-neutral-700 mb-3">Uploaded Medical Documents</p>
            <div className="space-y-2">
              {uploadedMedicalDocuments.map((doc) => (
                <a
                  key={doc.label}
                  href={doc.url as string}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                >
                  Open {doc.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Medical Information Grid */}
        {emergencyData && (
          <div className="grid grid-cols-2 gap-3">
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
              <div className="bg-primary-50 border-2 border-primary-300 rounded-lg p-3">
                <p className="text-xs font-bold text-primary-600 mb-1">
                  <Pill className="inline h-3 w-3" /> Medications
                </p>
                <p className="text-sm font-bold text-primary-700">{emergencyData.medications}</p>
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
          <div className="gradient-primary-dark rounded-xl p-4 shadow-md text-white">
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

        {/* Emergency Call Button */}
        <button
          onClick={() => window.location.href = 'tel:108'}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white py-4 rounded-lg font-bold text-lg transition-colors shadow-md"
        >
          📞 Call Emergency Services (108)
        </button>

        {/* Hospitals Section */}
        {hospitals.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-neutral-900 mb-3 flex items-center gap-2">
              <span className="bg-primary-500 w-1 h-6 rounded-full"></span>
              🏥 Nearest Hospitals
            </h2>
            <div className="space-y-3">
              {hospitals.map((hospital) => (
                <div key={hospital.id} className="bg-white rounded-lg shadow-md border-l-4 border-primary-600 p-4">
                  <h3 className="font-bold text-neutral-900 text-base">{hospital.name}</h3>
                  <p className="text-sm text-neutral-600 mt-1">{hospital.address}</p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-sm font-semibold text-primary-600">{hospital.distance} km away</p>
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
                      className="bg-primary-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-primary-700 flex items-center justify-center gap-1"
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
          <div className="flex items-center justify-center py-8 bg-neutral-50 rounded-lg">
            <Loader className="h-6 w-6 animate-spin text-blue-600 mr-2" />
            <span className="text-neutral-600 font-medium">Searching for nearby hospitals...</span>
          </div>
        )}

        <div className="text-center py-6 border-t border-neutral-200">
          <p className="font-bold text-neutral-900">INcase - Emergency Response System</p>
          <p className="text-sm text-neutral-600">All data secured • Golden-hour medical coordination</p>
        </div>
      </div>
    </div>
  );
}
