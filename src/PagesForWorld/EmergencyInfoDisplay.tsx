import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Phone, Navigation, AlertCircle, Loader, Droplet, Pill, Heart, Users } from 'lucide-react';

interface Hospital {
  id: string;
  name: string;
  address: string;
  phone?: string;
  type: string;
  rating?: number;
  distance: number;
  lat: number;
  lng: number;
  vicinity?: string;
}

type EmergencyContact = {
  name?: string;
  relationship?: string;
  phone?: string;
};

type EmergencyInfo = {
  fullName: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  bloodType?: string;
  address?: string;
  allergies?: string;
  medications?: string;
  medicalConditions?: string;
  emergencyContacts?: EmergencyContact[];
  photo?: string;
};

export default function EmergencyInfoDisplay() {
  const { email: identifierParam } = useParams();
  const [info, setInfo] = useState<EmergencyInfo | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [sosTriggered, setSosTriggered] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'https://incaseforh.vercel.app';

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      console.log('🔄 Reverse geocoding location...');
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      const address = data.address;
      
      // Build location name from address components
      const locationParts = [
        address.neighbourhood || address.suburb,
        address.city || address.town || address.village,
        address.state,
      ].filter(Boolean);
      
      const displayName = locationParts.join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      console.log('✅ Location name:', displayName);
      setLocationName(displayName);
    } catch (err) {
      console.error('Error reverse geocoding:', err);
      setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  useEffect(() => {
    const fetchEmergencyInfo = async () => {
      try {
        if (!identifierParam) {
          setError('No identifier provided');
          setLoading(false);
          return;
        }

        const isEmail = identifierParam.includes('@');
        const endpoint = isEmail
          ? `${API_BASE}/api/v1/emergency/${encodeURIComponent(identifierParam)}`
          : `${API_BASE}/api/v1/emergency/phone/${encodeURIComponent(identifierParam)}`;

        console.log('📡 Fetching emergency info from:', endpoint);
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log('✅ Emergency info loaded:', data.fullName);
        setInfo(data);
      } catch (err) {
        console.error('❌ Error fetching emergency info:', err);
        setError(err instanceof Error ? err.message : 'Error fetching data');
      } finally {
        setLoading(false);
      }
    };

    const getUserLocation = () => {
      console.log('🌍 Starting location detection...');
      if ('geolocation' in navigator) {
        console.log('📍 Requesting high-accuracy GPS location...');
        
        // Try to get the most accurate location possible
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            console.log('✅ GPS location obtained:', {
              lat: latitude,
              lng: longitude,
              accuracy: `${accuracy.toFixed(0)}m`,
              timestamp: new Date(position.timestamp).toLocaleTimeString()
            });
            
            setLocation({ lat: latitude, lng: longitude });
            setLocationError(accuracy > 100 ? `Location accuracy: ±${accuracy.toFixed(0)}m` : null);
            reverseGeocode(latitude, longitude);
            fetchNearbyHospitals(latitude, longitude);
            
            // Watch for better accuracy
            if (accuracy > 50) {
              console.log('⏳ Waiting for better GPS accuracy...');
              const watchId = navigator.geolocation.watchPosition(
                (newPos) => {
                  const newAccuracy = newPos.coords.accuracy;
                  if (newAccuracy < accuracy) {
                    console.log('✨ GPS accuracy improved:', `${newAccuracy.toFixed(0)}m`);
                    setLocation({ lat: newPos.coords.latitude, lng: newPos.coords.longitude });
                    setLocationError(newAccuracy > 100 ? `Location accuracy: ±${newAccuracy.toFixed(0)}m` : null);
                    reverseGeocode(newPos.coords.latitude, newPos.coords.longitude);
                    fetchNearbyHospitals(newPos.coords.latitude, newPos.coords.longitude);
                    
                    if (newAccuracy < 50) {
                      navigator.geolocation.clearWatch(watchId);
                    }
                  }
                },
                null,
                { enableHighAccuracy: true, maximumAge: 0 }
              );
              
              // Stop watching after 30 seconds
              setTimeout(() => navigator.geolocation.clearWatch(watchId), 30000);
            }
          },
          (err) => {
            console.warn('⚠️ GPS failed:', err.message, err.code);
            if (err.code === 1) {
              setLocationError('Location permission denied. Please enable location access.');
            } else if (err.code === 2) {
              setLocationError('Location unavailable. Using approximate location.');
            } else {
              setLocationError('Location timeout. Retrying...');
              
              // Retry with lower accuracy requirements
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const { latitude, longitude, accuracy } = position.coords;
                  console.log('✅ GPS location obtained (retry):', latitude, longitude, `±${accuracy.toFixed(0)}m`);
                  setLocation({ lat: latitude, lng: longitude });
                  setLocationError(`Location accuracy: ±${accuracy.toFixed(0)}m`);
                  reverseGeocode(latitude, longitude);
                  fetchNearbyHospitals(latitude, longitude);
                },
                () => {
                  console.error('❌ GPS retry failed, using fallback');
                  const mockLat = 17.3850;
                  const mockLng = 78.4867;
                  setLocation({ lat: mockLat, lng: mockLng });
                  setLocationError('Using approximate location (Hyderabad)');
                  reverseGeocode(mockLat, mockLng);
                  fetchNearbyHospitals(mockLat, mockLng);
                },
                { timeout: 30000, enableHighAccuracy: false, maximumAge: 60000 }
              );
              return;
            }
            const mockLat = 17.3850;
            const mockLng = 78.4867;
            setLocation({ lat: mockLat, lng: mockLng });
            reverseGeocode(mockLat, mockLng);
            fetchNearbyHospitals(mockLat, mockLng);
          },
          { timeout: 20000, enableHighAccuracy: true, maximumAge: 0 }
        );
      } else {
        console.warn('❌ Geolocation not supported');
        setLocationError('Location services not available on this device');
        const mockLat = 17.3850;
        const mockLng = 78.4867;
        setLocation({ lat: mockLat, lng: mockLng });
        reverseGeocode(mockLat, mockLng);
        fetchNearbyHospitals(mockLat, mockLng);
      }
    };

    fetchEmergencyInfo();
    getUserLocation();
    
    // Force location permission prompt on page load
    console.log('🌍 Initializing location services...');
  }, [identifierParam, API_BASE]);

  const fetchNearbyHospitals = async (lat: number, lng: number) => {
    console.log('🏥 Fetching hospitals near:', lat, lng);
    try {
      // Backend handles all fallbacks (including GeoNames via server env vars)
      const response = await fetch(`${API_BASE}/api/v1/hospitals/nearby?lat=${lat}&lng=${lng}&maxDistance=10000`);
      if (!response.ok) {
        throw new Error('Failed to fetch nearby hospitals');
      }

      const hospitalList = await response.json();
      console.log('✅ Hospitals from backend:', hospitalList?.length || 0);
      setHospitals((hospitalList || []).slice(0, 8));
    } catch (err) {
      console.error('❌ Error fetching hospitals:', err);
    }
  };

  const handleSOSButton = () => {
    setSosTriggered(true);
    triggerSOS();
    setTimeout(() => {
      window.location.href = 'tel:108';
    }, 1000);
  };

  const triggerSOS = async () => {
    if (!location || !info) return;
    try {
      await fetch(`${API_BASE}/api/v1/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          timestamp: new Date().toISOString(),
          emergencyContacts: info.emergencyContacts || [],
          victimName: info.fullName,
          victimPhone: info.phoneNumber,
        }),
      });
    } catch (err) {
      console.error('Error triggering SOS:', err);
    }
  };

  const callHospital = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const navigateToHospital = (lat: number, lng: number, _name: string) => {
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      window.location.href = `maps://maps.apple.com/?daddr=${lat},${lng}`;
    } else {
      window.location.href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Loading emergency information...</p>
        </div>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-orange-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md text-center border-2 border-red-200">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-700">{error || 'Emergency information not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pb-20">
      <div className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 shadow-lg border-b-4 border-blue-700">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertCircle className="h-7 w-7 animate-pulse" />
            Emergency Assistance
          </h1>
          <p className="text-blue-100 text-sm mt-1">Help is on the way</p>
        </div>
      </div>

      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur p-3 shadow-lg border-b-2 border-red-500">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleSOSButton}
            disabled={sosTriggered}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all transform active:scale-95 shadow-lg ${
              sosTriggered
                ? 'bg-green-500 text-white'
                : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-xl'
            }`}
          >
            {sosTriggered ? '✅ SOS ALERT SENT' : '🚨 EMERGENCY SOS'}
          </button>
          <p className="text-xs text-gray-600 text-center mt-2 font-medium">Notifies family & emergency services with location</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {info && (
          <div className="bg-white rounded-xl shadow-md border-l-4 border-blue-600 p-4">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Patient Information</p>
            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-xl font-bold text-gray-900">{info.fullName}</p>
              </div>
              {info.photo && (
                <img
                  src={info.photo}
                  alt={info.fullName}
                  className="w-32 h-32 rounded-lg object-cover shadow-lg border-2 border-blue-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
            </div>
          </div>
        )}

        {info && (
          <div className="grid grid-cols-2 gap-3">
            {info.bloodType && (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
                <p className="text-xs font-bold text-red-600 mb-1">
                  <Droplet className="inline h-3 w-3" /> Blood Type
                </p>
                <p className="text-lg font-bold text-red-700">{info.bloodType}</p>
              </div>
            )}
            {info.dateOfBirth && (
              <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-3">
                <p className="text-xs font-bold text-purple-600 mb-1">Date of Birth</p>
                <p className="text-lg font-bold text-purple-700">{info.dateOfBirth}</p>
              </div>
            )}
            {info.allergies && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3">
                <p className="text-xs font-bold text-yellow-600 mb-1">Allergies</p>
                <p className="text-sm font-bold text-yellow-700">{info.allergies}</p>
              </div>
            )}
            {info.medications && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
                <p className="text-xs font-bold text-blue-600 mb-1">
                  <Pill className="inline h-3 w-3" /> Medications
                </p>
                <p className="text-sm font-bold text-blue-700">{info.medications}</p>
              </div>
            )}
            {info.medicalConditions && (
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 col-span-2">
                <p className="text-xs font-bold text-green-600 mb-1">
                  <Heart className="inline h-3 w-3" /> Medical Conditions
                </p>
                <p className="text-sm font-bold text-green-700">{info.medicalConditions}</p>
              </div>
            )}
          </div>
        )}

        {location && (
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 shadow-md text-white">
            <div className="flex items-start gap-3">
              <MapPin className="h-6 w-6 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-lg mb-1">📍 Live Location</p>
                <p className="text-sm font-semibold mb-1">
                  {locationName || 'Fetching location...'}
                </p>
                <p className="text-xs opacity-90">
                  <span className="font-mono">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
                </p>
                {locationError && <p className="text-sm mt-2 text-yellow-100">⚠️ {locationError}</p>}
              </div>
            </div>
          </div>
        )}

        {info?.emergencyContacts && info.emergencyContacts.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border-l-4 border-green-600 p-4">
            <p className="text-sm font-bold text-green-600 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Emergency Contacts
            </p>
            <div className="space-y-2">
              {info.emergencyContacts.map((contact, idx) => (
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

        <button
          onClick={() => window.location.href = 'tel:108'}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-lg font-bold text-lg transition-colors shadow-md"
        >
          📞 Call Emergency Services (108)
        </button>

        {hospitals.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="bg-red-500 w-1 h-6 rounded-full"></span>
              🏥 Nearest Hospitals
            </h2>
            <div className="space-y-3">
              {hospitals.map((hospital) => (
                <div key={hospital.id} className="bg-white rounded-lg shadow-md border-l-4 border-indigo-600 p-4">
                  <h3 className="font-bold text-gray-900 text-base">{hospital.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{hospital.address}</p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-sm font-semibold text-blue-600">{hospital.distance} km away</p>
                    {hospital.rating && <p className="text-sm text-yellow-600">⭐ {hospital.rating.toFixed(1)}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {hospital.phone && (
                      <button
                        onClick={() => callHospital(hospital.phone || '')}
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
