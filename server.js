import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import cors from 'cors';
import EmergencyInfo from './models/EmergencyInfo.js';

// Only load .env locally, not in production (Render uses dashboard env vars)
if (process.env.NODE_ENV !== 'production') {
  try {
    const dotenv = await import('dotenv');
    dotenv.config();
  } catch (e) {
    // dotenv not available, skip
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  const allowedOrigins = ['http://localhost:5173', 'https://incaseforh.vercel.app'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS');
    res.sendStatus(200);
  } else {
    next();
  }
});
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // FOR FormData PARSING

const upload = multer({ dest: 'uploads/', limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

// Connect to MongoDB
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'NOT SET');
mongoose.connect(process.env.MONGODB_URI, { 
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err.message));

// Basic route
app.get('/', (req, res) => {
  res.send('Server is running and connected to MongoDB');
});

// API Routes
app.post('/api/emergency', upload.single('photo'), async (req, res) => {
  try {
    console.log('=== POST /api/emergency START ===');
    console.log('Received body:', JSON.stringify(req.body, null, 2));
    console.log('Received file:', req.file);

    // STEP 1: VALIDATION - Check required fields
    console.log('STEP 1: Validating required fields...');
    const { fullName, email } = req.body;
    
    if (!fullName) {
      console.error('❌ VALIDATION FAILED: fullName is undefined/null');
      return res.status(400).json({ error: 'fullName is required', received: { fullName } });
    }
    if (typeof fullName !== 'string' || fullName.trim() === '') {
      console.error('❌ VALIDATION FAILED: fullName is empty or not string:', typeof fullName);
      return res.status(400).json({ error: 'fullName must be non-empty string', received: { fullName } });
    }

    if (!email) {
      console.error('❌ VALIDATION FAILED: email is undefined/null');
      return res.status(400).json({ error: 'email is required', received: { email } });
    }
    if (typeof email !== 'string' || email.trim() === '') {
      console.error('❌ VALIDATION FAILED: email is empty or not string:', typeof email);
      return res.status(400).json({ error: 'email must be non-empty string', received: { email } });
    }

    console.log('✅ Required fields valid');

    // STEP 2: SAFE FIELD CONVERSION
    console.log('STEP 2: Converting fields safely...');
    const safeString = (val) => {
      if (!val) return null;
      if (typeof val !== 'string') return String(val);
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    };

    const emergencyData = {
      fullName: safeString(fullName),
      email: safeString(email),
      bloodType: safeString(req.body.bloodType),
      emergencyContact: safeString(req.body.emergencyContact),
      allergies: safeString(req.body.allergies),
      medications: safeString(req.body.medications),
      medicalConditions: safeString(req.body.medicalConditions),
      photo: req.file ? req.file.path : null,
      dateOfBirth: safeString(req.body.dateOfBirth),
      address: safeString(req.body.address),
      phoneNumber: safeString(req.body.phoneNumber),
      qrCode: safeString(req.body.qrCode),
    };

    console.log('✅ Fields converted:', JSON.stringify(emergencyData, null, 2));

    // STEP 3: CREATE MODEL
    console.log('STEP 3: Creating Mongoose document...');
    const newEmergency = new EmergencyInfo(emergencyData);
    console.log('✅ Document created, schema validation passed');

    // STEP 4: SAVE TO DATABASE
    console.log('STEP 4: Saving to MongoDB...');
    const savedDoc = await newEmergency.save();
    
    console.log('✅ SAVED SUCCESSFULLY:', savedDoc._id);
    res.status(201).json({ 
      message: 'Emergency info saved successfully', 
      id: savedDoc._id,
      email: savedDoc.email,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('');
    console.error('❌❌❌ ERROR IN POST /api/emergency ❌❌❌');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (error.errors) {
      console.error('Mongoose validation errors:', error.errors);
    }
    console.error('');
    
    res.status(500).json({ 
      error: error.message,
      type: error.name,
      validation: error.errors || 'No validation details'
    });
  }
});

app.get('/api/emergency/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const emergency = await EmergencyInfo.findOne({ email });
    if (!emergency) {
      return res.status(404).json({ error: 'Emergency info not found' });
    }
    res.json(emergency);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all emergency records (for QR List)
app.get('/api/emergency', async (req, res) => {
  try {
    console.log('Fetching all emergency records...');
    const allEmergencies = await EmergencyInfo.find({}).select('fullName email qrCode createdAt');
    console.log(`Found ${allEmergencies.length} records`);
    res.json(allEmergencies);
  } catch (error) {
    console.error('Error fetching emergency records:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ status: 'healthy', mongodb: 'connected', timestamp: new Date() });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', mongodb: 'disconnected', error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});