# INcase - Phase 1 Implementation Guide

## 🚀 What's New - Emergency Assist Mode

The QR scan page has been completely redesigned to be **Privacy-First** and **Life-Saving**:

### Before (RideGuard)
- QR contained ALL personal data (name, phone, blood type)
- QRScanDisplay showed all info immediately
- Basic emergency contacts list
- No hospital/location integration

### After (INcase - Phase 1)
- ✅ QR encodes only **secure unique ID** (not personal data)
- ✅ **Emergency Assist Mode** - privacy-first scan page
- ✅ **GPS Location Detection** with fallback to IP/manual entry
- ✅ **Nearby Hospital Search** - finds hospitals within 10km
- ✅ **Hospital Prioritization** - Trauma Centers → Government → Private
- ✅ **One-tap 108 Call Button** - large, panic-friendly
- ✅ **SOS Trigger** - alerts family automatically with location
- ✅ **Privacy Protection** - Medical data stays encrypted
- ✅ **Call & Navigate** - direct buttons for each hospital

---

## 📋 Setup Instructions (Localhost)

### 1. Install Dependencies & Start Server

```bash
cd iquvishnu/RideGaurd

# Make sure all dependencies are installed
npm install

# In one terminal - Start backend server
npm run server
# Should output: "Server running on port 5000"
```

### 2. Seed Hospital Database

```bash
# In another terminal - Seed hospitals into MongoDB
npm run seed:hospitals

# You should see output like:
# ✅ Connected to MongoDB
# 🗑️  Cleared 0 existing hospitals
# ✅ Created 10 hospitals
# 📍 Hospital List:
# 1. Victoria Hospital (trauma-center) - Bangalore
# 2. Columbia Asia Hospital (private) - Bangalore
# ... etc
```

### 3. Start Frontend

```bash
# In third terminal - Start Vite dev server
npm run dev

# Should open http://localhost:5173
```

### 4. Test the Flow

```
1. Go to http://localhost:5173 (home page)
2. Click "Emergency QR Code" or navigate to /qrs
3. Fill in emergency info (name, phone, blood group, photo)
4. Click "Generate QR Code" or "Download QR"
5. Copy the generated URL from browser dev tools or screenshot the QR
6. Open that URL in a new tab (or scan with another phone/QR scanner)
7. You'll see the **Emergency Assist Mode** page
```

---

## 🏥 New API Endpoints

### Public Endpoints (No Auth Required)

#### 1. Get Nearby Hospitals
```
GET /api/hospitals/nearby?lat=12.9716&lng=77.5946&maxDistance=10000
```

**Query Params:**
- `lat` (required): User latitude
- `lng` (required): User longitude
- `maxDistance` (optional): Search radius in meters, default 5000m (5km)

**Response:**
```json
[
  {
    "id": "hospital_id_123",
    "name": "Victoria Hospital",
    "address": "Fort Area, Bangalore",
    "city": "Bangalore",
    "phone": "080-2686-9999",
    "ambulancePhone": "080-2686-9999",
    "type": "trauma-center",
    "rating": 4.5,
    "distance": 2.34,
    "hasAmbulance": true,
    "hasICU": true,
    "hasOperatingTheatre": true,
    "operatingHours": "24/7",
    "lat": 12.9789,
    "lng": 77.5960
  },
  ...
]
```

#### 2. Trigger SOS Alert
```
POST /api/sos/trigger
Content-Type: application/json
```

**Body:**
```json
{
  "location": {
    "lat": 12.9716,
    "lng": 77.5946
  },
  "timestamp": "2024-01-05T10:30:00Z",
  "emergencyContacts": [
    {"name": "Mom", "phone": "+919876543210"},
    {"name": "Dad", "phone": "+919876543211"}
  ],
  "victimName": "John Doe",
  "victimPhone": "+919876543212"
}
```

**Response:**
```json
{
  "message": "SOS triggered successfully",
  "contactsNotified": 2,
  "timestamp": "2024-01-05T10:30:00Z"
}
```

---

## 🗺️ Hospital Database Schema

```javascript
{
  name: String,              // Hospital name
  address: String,           // Full address
  city: String,             // City name
  state: String,            // State
  pincode: String,          // Postal code
  location: {               // GeoJSON for geospatial queries
    type: "Point",
    coordinates: [lng, lat] // [longitude, latitude]
  },
  phone: String,            // Main hospital phone
  ambulancePhone: String,   // Ambulance dispatch phone
  emergencyPhone: String,   // Emergency hotline (default: 108)
  hasAmbulance: Boolean,    // Has ambulance service
  type: String,             // "government" | "private" | "trauma-center" | "nursing-home"
  hasICU: Boolean,          // ICU availability
  hasOperatingTheatre: Boolean, // Surgery capability
  rating: Number,           // 0-5 rating
  website: String,          // Hospital website
  operatingHours: String,   // "24/7" etc
  acceptsEmergency: Boolean // Accepts emergency cases
}
```

---

## 📱 New Component: QRScanDisplay (Privacy-First)

**File:** `src/components/emergency/QRScanDisplay.tsx`

### Features:
1. **Emergency Assist Mode Banner** - Red header, pulsing alert icon
2. **Large SOS Button** - 1-tap button to trigger SOS and call 108
3. **GPS Location** - Auto-detect on scan, with fallback to Bangalore coords (for testing)
4. **Hospital List** - Fetches from `/api/hospitals/nearby` endpoint
5. **Hospital Cards** - Shows distance, rating, type (trauma/ICU/ambulance)
6. **Call & Navigate** - Direct phone call and Google Maps integration
7. **Privacy Notice** - Shows medical data stays encrypted
8. **Victim Info Preview** - Shows name & phone (not medical data)

### Key Differences from Old QRScanDisplay:
```
OLD: Shows name, phone, blood type, photo, all medical data
NEW: Shows ONLY name/phone (preview), hides blood type behind privacy lock
OLD: Static emergency contacts list
NEW: Automatic SOS to family + dynamic hospital list
OLD: No location/hospital features
NEW: GPS + 10km hospital search with navigation
```

---

## 🔍 Hospital Prioritization Logic

Hospitals are sorted by:
1. **Type** (highest priority first):
   - Trauma Centers 🚨 (highest)
   - Government Hospitals
   - Private Hospitals
   - Nursing Homes (lowest)

2. **Distance** (within same type):
   - Closest hospitals first

**Example Sort Result:**
```
1. Victoria Hospital (Trauma Center) - 2.3 km
2. St Johns Medical (Private, ICU) - 2.8 km
3. Apollo Hospital (Private) - 4.1 km
4. Care Hospital (Private) - 5.2 km
5. Columbia Asia (Private, Ambulance) - 6.7 km
```

---

## 🧪 Testing Checklist

### Test 1: Hospital Search
- [ ] Go to `/qrs` (or create new emergency)
- [ ] Open the QR scan page (simulate by going to the emergency info URL)
- [ ] Verify GPS/location is detected
- [ ] Verify hospitals are loaded in order (trauma centers first)
- [ ] Check hospital distance calculations are correct
- [ ] Try calling a hospital (should show tel: prompt)
- [ ] Try navigating to hospital (should open Google Maps)

### Test 2: SOS Button
- [ ] Click the large "🚨 EMERGENCY SOS" button
- [ ] Button should change to "✓ SOS Sent to Emergency Contacts"
- [ ] Check console - should show SOS notification log
- [ ] Check that tel:108 is triggered (or simulated)
- [ ] Verify SOS carries location and emergency contacts

### Test 3: Privacy Protection
- [ ] On QR scan page, verify blood type is NOT visible
- [ ] Verify medical data prompt shows "🔒 encrypted & protected"
- [ ] Verify family members' names/phones are shown (for SOS)
- [ ] Verify emergency contacts can be used for SOS

### Test 4: Location Detection
- [ ] Test GPS (allow location permission)
- [ ] Test GPS denial (should fallback to Bangalore default)
- [ ] Verify location coordinates are shown
- [ ] Verify hospital search uses correct location

### Test 5: Hospital Data
- [ ] Run `npm run seed:hospitals` command
- [ ] Verify 10 hospitals are created in MongoDB
- [ ] Check hospitals have proper geospatial coordinates
- [ ] Verify different hospital types (trauma/government/private)

---

## 🔧 Configuration

### Backend URLs (localhost vs production)
**Local Development:**
```javascript
// server.js runs on http://localhost:5000
// Frontend env: VITE_API_URL=http://localhost:5000 (auto-detected)
```

**Production:**
```javascript
// Backend: https://incaseforh.onrender.com
// Frontend: .env.production sets VITE_API_URL accordingly
```

### Hospital Database
**Local:** Uses hardcoded MongoDB URI in seedHospitals.js
**Production:** Uses process.env.MONGODB_URI from Render dashboard

---

## 🚨 Known Limitations & TODOs

### Currently Implemented ✅
- GPS location detection with fallback
- Hospital geospatial search
- SOS button with emergency contact logging
- Call & navigate buttons
- Hospital prioritization by type & distance
- Privacy-first UI (no medical data on QR scan)

### TODO - Phase 2
- [ ] Actual SMS notifications (Twilio/Vonage)
- [ ] WhatsApp notifications
- [ ] Push notifications
- [ ] Hospital OTP unlock for medical data
- [ ] Admission status tracking
- [ ] Helper contact workflow (24hr expiry)
- [ ] Audit event logging
- [ ] Rate limiting & abuse detection

### TODO - Phase 3
- [ ] PWA offline support
- [ ] Low-bandwidth optimization
- [ ] Regional language support
- [ ] Advanced analytics dashboard
- [ ] Integration with government emergency systems

---

## 📊 Database Collections

### Collections Created:
1. **hospitals** - Hospital details & geospatial data
2. **emergencyinfos** - User emergency info (existing)
3. **users** - User accounts (existing)
4. **actionlogs** - Audit logs (existing)

### New Geospatial Index:
```javascript
Hospital.collection.createIndex({ location: '2dsphere' })
```

---

## 🎯 Next Steps

### To Deploy Phase 1:
1. ✅ Test all features locally
2. ✅ Run `npm run seed:hospitals`
3. ✅ Commit changes to git
4. Push to GitHub/Render
5. Hospital DB automatically seeded on render via script

### To Start Phase 2:
1. Implement SMS notifications (Twilio)
2. Add OTP unlock for medical data
3. Implement hospital status updates
4. Add family notifications

---

## 📞 Support

- **Emergency Number:** 108
- **Hospital Data Source:** Seeded from Bangalore metro hospitals
- **Coordinates System:** WGS84 (Standard GPS)
- **Distance Calculation:** Haversine formula (km)

---

**Version:** INcase Phase 1  
**Last Updated:** January 5, 2026  
**Status:** ✅ Ready for Localhost Testing

