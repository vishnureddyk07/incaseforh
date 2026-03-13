import mongoose from 'mongoose';
import Hospital from './models/Hospital.js';

// Only load .env locally
if (process.env.NODE_ENV !== 'production') {
  try {
    const dotenv = await import('dotenv');
    dotenv.config();
  } catch (e) {
    console.log('dotenv not available');
  }
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vishnureddyau07_db_user:59uPRJVWJ978fRUp@cluster0.tahxcai.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const hospitals = [
  // Government / Trauma - Hyderabad
  {
    name: 'Gandhi Hospital',
    address: 'Musheerabad',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500003',
    location: { type: 'Point', coordinates: [78.5081, 17.4337] },
    phone: '040-2750-6510',
    ambulancePhone: '040-2750-6510',
    emergencyPhone: '108',
    hasAmbulance: true,
    type: 'trauma-center',
    hasICU: true,
    hasOperatingTheatre: true,
    rating: 4.1,
    operatingHours: '24/7',
    acceptsEmergency: true,
  },
  {
    name: 'Osmania General Hospital',
    address: 'Afzal Gunj',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500012',
    location: { type: 'Point', coordinates: [78.4790, 17.3660] },
    phone: '040-2353-7142',
    ambulancePhone: '040-2353-7142',
    emergencyPhone: '108',
    hasAmbulance: true,
    type: 'trauma-center',
    hasICU: true,
    hasOperatingTheatre: true,
    rating: 4.0,
    operatingHours: '24/7',
    acceptsEmergency: true,
  },

  // Major private
  {
    name: 'Apollo Hospitals Jubilee Hills',
    address: 'Road No. 72, Jubilee Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500033',
    location: { type: 'Point', coordinates: [78.4121, 17.4273] },
    phone: '040-2360-7777',
    ambulancePhone: '040-6060-1066',
    emergencyPhone: '1066',
    hasAmbulance: true,
    type: 'private',
    hasICU: true,
    hasOperatingTheatre: true,
    rating: 4.7,
    operatingHours: '24/7',
    acceptsEmergency: true,
  },
  {
    name: 'KIMS Hospitals Secunderabad',
    address: 'Minister Road, Secunderabad',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500003',
    location: { type: 'Point', coordinates: [78.4902, 17.4414] },
    phone: '040-4488-5000',
    ambulancePhone: '040-4488-5151',
    emergencyPhone: '040-4488-5000',
    hasAmbulance: true,
    type: 'private',
    hasICU: true,
    hasOperatingTheatre: true,
    rating: 4.6,
    operatingHours: '24/7',
    acceptsEmergency: true,
  },
  {
    name: 'Yashoda Hospital Secunderabad',
    address: 'Alexander Road, Secunderabad',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500003',
    location: { type: 'Point', coordinates: [78.4983, 17.4399] },
    phone: '040-4567-4567',
    ambulancePhone: '040-4567-4567',
    emergencyPhone: '040-4567-4567',
    hasAmbulance: true,
    type: 'private',
    hasICU: true,
    hasOperatingTheatre: true,
    rating: 4.6,
    operatingHours: '24/7',
    acceptsEmergency: true,
  },
  {
    name: 'CARE Hospitals Banjara Hills',
    address: 'Road No. 1, Banjara Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500034',
    location: { type: 'Point', coordinates: [78.4485, 17.4156] },
    phone: '040-3041-5151',
    ambulancePhone: '040-3041-5151',
    emergencyPhone: '040-3041-5151',
    hasAmbulance: true,
    type: 'private',
    hasICU: true,
    hasOperatingTheatre: true,
    rating: 4.5,
    operatingHours: '24/7',
    acceptsEmergency: true,
  },
  {
    name: 'AIG Hospitals Gachibowli',
    address: 'Gachibowli',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500032',
    location: { type: 'Point', coordinates: [78.3663, 17.4513] },
    phone: '040-6788-8888',
    ambulancePhone: '040-6788-8888',
    emergencyPhone: '040-6788-8888',
    hasAmbulance: true,
    type: 'private',
    hasICU: true,
    hasOperatingTheatre: true,
    rating: 4.7,
    operatingHours: '24/7',
    acceptsEmergency: true,
  },
  {
    name: 'Continental Hospitals',
    address: 'Financial District, Gachibowli',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500032',
    location: { type: 'Point', coordinates: [78.3565, 17.4438] },
    phone: '040-6700-0000',
    ambulancePhone: '040-6700-0000',
    emergencyPhone: '040-6700-0000',
    hasAmbulance: true,
    type: 'private',
    hasICU: true,
    hasOperatingTheatre: true,
    rating: 4.6,
    operatingHours: '24/7',
    acceptsEmergency: true,
  },
  {
    name: 'Rainbow Children’s Hospital Banjara Hills',
    address: 'Road No. 10, Banjara Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500034',
    location: { type: 'Point', coordinates: [78.4422, 17.4144] },
    phone: '040-2331-1205',
    ambulancePhone: '040-2331-1205',
    emergencyPhone: '040-2331-1205',
    hasAmbulance: true,
    type: 'private',
    hasICU: true,
    hasOperatingTheatre: true,
    rating: 4.4,
    operatingHours: '24/7',
    acceptsEmergency: true,
  },
  {
    name: 'NIMS (Nizam’s Institute of Medical Sciences)',
    address: 'Punjagutta',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500082',
    location: { type: 'Point', coordinates: [78.4482, 17.4290] },
    phone: '040-2348-9000',
    ambulancePhone: '040-2348-9000',
    emergencyPhone: '108',
    hasAmbulance: true,
    type: 'government',
    hasICU: true,
    hasOperatingTheatre: true,
    rating: 4.3,
    operatingHours: '24/7',
    acceptsEmergency: true,
  },
];

async function seedHospitals() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing hospitals
    const deleted = await Hospital.deleteMany({});
    console.log(`🗑️  Cleared ${deleted.deletedCount} existing hospitals`);

    // Insert new hospitals
    const created = await Hospital.insertMany(hospitals);
    console.log(`✅ Created ${created.length} hospitals`);

    console.log('\n📍 Hospital List:');
    created.forEach((h, i) => {
      console.log(`${i + 1}. ${h.name} (${h.type}) - ${h.city}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding hospitals:', error);
    process.exit(1);
  }
}

seedHospitals();
