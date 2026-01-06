# INcase Phase 1 - Visual Architecture & Flow Diagrams

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER (Emergency QR Scanner)               │
└────────────────────────┬────────────────────────────────────┘
                         │
                    Scan QR Code
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
    ┌─────────────┐          ┌──────────────────┐
    │ Old System  │          │  INcase Phase 1  │
    │ (RideGuard) │          │   (New Privacy)  │
    └─────────────┘          └──────────────────┘
         │                            │
    Shows ALL data:            Shows ONLY:
    • Name ✓                   • Name ✓
    • Phone ✓                  • Phone ✓
    • Blood Type ✓             • Location ✓
    • Medical Conditions ✓     • Hospitals ✓
    • Medications ✓            • 108 Button ✓
    • Allergies ✓              • SOS Alert ✓
    • Photo ✓                  
                          Hides ENCRYPTED:
                          • Blood Type ✗
                          • Medical Conditions ✗
                          • Medications ✗
                          • Allergies ✗
```

---

## 📱 Data Flow - Emergency Assist Mode

```
Step 1: User Scans QR
└─→ Opens https://app.com/emergencyinfo/abc@example.com

Step 2: App Loads QRScanDisplay Component
├─→ Fetch emergency info from /api/emergency/:email
├─→ Detect GPS location (or fallback to Bangalore)
└─→ Render Emergency Assist Page

Step 3: Location Detected
├─→ GPS coordinates obtained (or IP fallback)
└─→ Display location coordinates

Step 4: Fetch Nearby Hospitals
├─→ Call /api/hospitals/nearby?lat=X&lng=Y&maxDistance=10000
├─→ MongoDB geospatial query returns 10 hospitals
├─→ Calculate distance for each hospital
├─→ Sort by type (trauma first) then distance
└─→ Display hospital list with call/navigate buttons

Step 5: User Actions
├─→ [108 Button] → tel:108 (make emergency call)
├─→ [Hospital Call] → tel:hospital.phone (call hospital)
├─→ [Hospital Navigate] → Google Maps (route to hospital)
└─→ [SOS Button] → POST /api/sos/trigger (alert family)

Step 6: SOS Triggered
├─→ Send location + timestamp + emergency contacts to backend
├─→ Backend logs SOS event
├─→ (Phase 2) Send SMS/WhatsApp to emergency contacts
└─→ Auto-dial 108 after 1 second
```

---

## 🏥 Hospital Search Flow

```
┌──────────────────────────────────────┐
│ User Location Detected               │
│ lat: 12.9716, lng: 77.5946          │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ Call /api/hospitals/nearby           │
│ ?lat=12.9716&lng=77.5946            │
│ &maxDistance=10000 (10km)            │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ MongoDB Geospatial Query             │
│ Find hospitals within 10km           │
│ Using 2dsphere index                 │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ Calculate Distance (Haversine)       │
│ For each hospital found              │
│ Distance = √((lat2-lat1)² + ...)    │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ Sort Results                         │
│ 1. By Type (Trauma > Govt > Pvt)    │
│ 2. By Distance (Closest First)       │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ Return Top 10 Hospitals              │
│ With distance, phone, services       │
│ JSON Response                        │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ Display Hospital List                │
│ • Victoria (2.3 km, Trauma)         │
│ • Columbia Asia (6.7 km, Private)   │
│ ... etc                              │
└──────────────────────────────────────┘
```

---

## 🗺️ Hospital Prioritization Algorithm

```
Step 1: Filter by Type
┌─────────────────────────────────────┐
│ All Hospitals in Database           │
├─────────────────────────────────────┤
│ Type Priority:                      │
│ 1. Trauma Centers (🚨)  ← FIRST    │
│ 2. Government (🏛️)                  │
│ 3. Private (🏢)                     │
│ 4. Nursing Homes (🏠)  ← LAST      │
└─────────────────────────────────────┘

Step 2: Within Each Type, Sort by Distance
┌─────────────────────────────────────┐
│ Trauma Centers:                     │
│ 1. 2.3 km ← Closest                │
│ 2. 5.1 km                          │
│ 3. 8.9 km ← Farthest               │
│                                     │
│ Private Hospitals:                  │
│ 1. 2.8 km ← Closest                │
│ 2. 4.1 km                          │
│ ... etc                             │
└─────────────────────────────────────┘

Step 3: Final Sorted List
┌─────────────────────────────────────┐
│ FINAL RESULT:                       │
│ 1. Victoria (Trauma, 2.3 km)       │
│ 2. Bowring (Trauma, 5.1 km)        │
│ 3. Columbia Asia (Private, 2.8 km) │
│ 4. St Johns (Private, 4.1 km)      │
│ ... etc (max 10)                    │
└─────────────────────────────────────┘
```

---

## 🔐 Privacy Model - Data Access

```
┌───────────────────────────────────────────────────────────┐
│                    Emergency Information                  │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ PUBLIC DATA (Visible to QR Scanner):                     │
│ ├─ Victim Name              ✓ VISIBLE                    │
│ ├─ Victim Phone             ✓ VISIBLE                    │
│ ├─ Scanner Location         ✓ VISIBLE                    │
│ ├─ Emergency Contacts       ✓ VISIBLE (for SOS)         │
│ ├─ Nearby Hospitals         ✓ VISIBLE                    │
│ └─ 108 Button               ✓ VISIBLE                    │
│                                                           │
│ ENCRYPTED DATA (Hidden by Default):                      │
│ ├─ Blood Type               🔒 LOCKED                    │
│ ├─ Medical Conditions       🔒 LOCKED                    │
│ ├─ Medications              🔒 LOCKED                    │
│ ├─ Allergies                🔒 LOCKED                    │
│ └─ Photo                    🔒 LOCKED (Phase 2)         │
│                                                           │
│ WHO CAN UNLOCK (Phase 2):                               │
│ ├─ Hospital with OTP        ✓ CAN UNLOCK                │
│ ├─ Family member with PIN   ✓ CAN UNLOCK                │
│ ├─ Random bystander         ✗ CANNOT UNLOCK             │
│ └─ Admin                    ✓ CAN VIEW (audit)          │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 🚨 SOS Alert Flow

```
┌─────────────────────────────────────┐
│ User Clicks SOS Button              │
│ "🚨 EMERGENCY SOS"                 │
└────────────┬───────────────────────┘
             │
      ┌──────┴──────┐
      ▼             ▼
  POST SOS     Change Button
  to Backend   State
      │         
      ▼
┌─────────────────────────────────────┐
│ /api/sos/trigger                    │
│ {                                   │
│   location: {lat, lng},             │
│   timestamp: ISO,                   │
│   emergencyContacts: [...],         │
│   victimName: "",                   │
│   victimPhone: ""                   │
│ }                                   │
└────────────┬───────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ Backend Logs SOS Event              │
│ Console: 🚨 SOS TRIGGERED           │
│ Victim: John Doe                    │
│ Location: 12.9716, 77.5946          │
│ Contacts: 2 notified                │
└────────────┬───────────────────────┘
             │
      ┌──────┴──────────────────────┐
      │                             │
      ▼                             ▼
  Frontend:              Backend (Phase 2):
  After 1 sec            SMS to: Mom
  tel:108 → Call         "John needs help!"
                         Location + timestamp
                         
                         WhatsApp to: Dad
                         (Optional)
                         
                         Push Notification
                         to Family App
```

---

## 📊 Database Schema - Hospital

```javascript
Hospital Collection:
{
  _id: ObjectId,
  name: "Victoria Hospital",
  address: "Fort Area, Bangalore",
  city: "Bangalore",
  state: "Karnataka",
  pincode: "560053",
  
  // GEOSPATIAL
  location: {
    type: "Point",
    coordinates: [77.5960, 12.9789]  // [lng, lat]
  },
  
  // CONTACT
  phone: "080-2686-9999",
  ambulancePhone: "080-2686-9999",
  emergencyPhone: "108",
  
  // SERVICES
  hasAmbulance: true,
  hasICU: true,
  hasOperatingTheatre: true,
  
  // CLASSIFICATION
  type: "trauma-center",  // trauma-center | government | private | nursing-home
  rating: 4.5,
  acceptsEmergency: true,
  
  // OTHER
  website: "https://...",
  operatingHours: "24/7",
  
  // TIMESTAMPS
  createdAt: "2024-01-05T10:00:00Z",
  updatedAt: "2024-01-05T10:00:00Z"
}

INDEXES:
- location: 2dsphere        (for geospatial queries)
- city: 1, type: 1          (for filtering)
- acceptsEmergency: 1       (for filtering)
```

---

## 🔄 QR Generation vs QRScan - Privacy Difference

```
EMERGENCY FORM (User creates profile)
└─→ Fills: Name, Phone, Blood Type, Medications, Allergies
└─→ Uploads: Photo
└─→ Adds: Emergency Contacts

QR CODE GENERATION (What QR encodes)
└─→ URL: https://app.com/emergencyinfo/abc@example.com
└─→ Contains: ONLY the identifier
└─→ All medical data: Stored in MONGODB only
└─→ QR Code: Cannot be decoded by QR readers (just a URL)

QR SCAN DISPLAY (What scanner sees)
OLD System:
└─→ Full profile visible immediately
└─→ Name, phone, blood type, all medical data exposed

INcase Phase 1:
├─→ Name & phone for identification ✓
├─→ Location for emergency response ✓
├─→ Hospitals for routing ✓
├─→ 108 button for emergency ✓
├─→ SOS alert to family ✓
└─→ Medical data: ENCRYPTED & HIDDEN ✗

INcase Phase 2 (Future):
├─→ Hospital OTP unlock ← Hospital can request
├─→ Family PIN unlock ← Family member can request
└─→ Audit log ← Track who accessed what
```

---

## 📡 API Response Examples

### Hospital Search Response
```json
GET /api/hospitals/nearby?lat=12.9716&lng=77.5946

[
  {
    "id": "hospital_123",
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
  {
    "id": "hospital_456",
    "name": "Columbia Asia Hospital",
    "address": "Whitefield, Bangalore",
    "city": "Bangalore",
    "phone": "080-7123-9000",
    "ambulancePhone": "080-7123-9001",
    "type": "private",
    "rating": 4.6,
    "distance": 6.78,
    "hasAmbulance": true,
    "hasICU": true,
    "hasOperatingTheatre": true,
    "operatingHours": "24/7",
    "lat": 12.9698,
    "lng": 77.7499
  }
  // ... up to 10 hospitals
]
```

### SOS Trigger Response
```json
POST /api/sos/trigger

Request Body:
{
  "location": {
    "lat": 12.9716,
    "lng": 77.5946
  },
  "timestamp": "2024-01-05T15:30:00Z",
  "emergencyContacts": [
    {"name": "Mom", "phone": "+919876543210"},
    {"name": "Dad", "phone": "+919987654321"}
  ],
  "victimName": "John Doe",
  "victimPhone": "+919876543200"
}

Response:
{
  "message": "SOS triggered successfully",
  "contactsNotified": 2,
  "timestamp": "2024-01-05T15:30:00Z"
}
```

---

## ⚙️ Technology Stack

```
Frontend:
├─ React + TypeScript
├─ Lucide React (Icons)
├─ Geolocation API (GPS)
└─ Google Maps Navigation

Backend:
├─ Node.js + Express
├─ MongoDB (with 2dsphere indexing)
├─ JWT (Authentication)
├─ Multer (File upload)
└─ Mongoose (ORM)

Infrastructure:
├─ Frontend: Vercel
├─ Backend: Render
├─ Database: MongoDB Atlas
└─ Git: GitHub
```

---

## 🎯 Success Metrics - Phase 1

```
User Scanning QR:
✓ Loads in < 3 seconds
✓ Shows Emergency Assist Mode
✓ Detects location (GPS or fallback)
✓ Finds hospitals within 10km
✓ Can call 108
✓ Can call hospital
✓ Can navigate to hospital
✓ Privacy notice visible
✓ Medical data hidden

Backend Performance:
✓ Hospital search < 100ms
✓ SOS logging < 50ms
✓ Geospatial query optimal
✓ No database errors
✓ Proper error handling

User Experience:
✓ Mobile-first design
✓ Large touch targets
✓ Minimal text (panic-friendly)
✓ Clear visual hierarchy
✓ Color coding (red = danger)
```

---

This completes INcase Phase 1! 🎉

Ready to test locally?

