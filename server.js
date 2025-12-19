import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import multer from 'multer';
import cors from 'cors';
import EmergencyInfo from './models/EmergencyInfo.js';

dotenv.config();

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
    console.log('=== POST /api/emergency ===');
    console.log('Received body:', req.body);
    console.log('Received file:', req.file);

    // VALIDATION: Check required fields
    const { fullName, email } = req.body;
    if (!fullName || fullName.trim() === '') {
      console.warn('VALIDATION FAILED: fullName is missing');
      return res.status(400).json({ error: 'fullName is required' });
    }
    if (!email || email.trim() === '') {
      console.warn('VALIDATION FAILED: email is missing');
      return res.status(400).json({ error: 'email is required' });
    }

    // Build emergency data - convert empty strings to null for optional fields
    const emergencyData = {
      fullName: fullName.trim(),
      email: email.trim(),
      bloodType: req.body.bloodType?.trim() || null,
      emergencyContact: req.body.emergencyContact?.trim() || null,
      allergies: req.body.allergies?.trim() || null,
      medications: req.body.medications?.trim() || null,
      medicalConditions: req.body.medicalConditions?.trim() || null,
      photo: req.file ? req.file.path : null,
      dateOfBirth: req.body.dateOfBirth?.trim() || null,
      address: req.body.address?.trim() || null,
      phoneNumber: req.body.phoneNumber?.trim() || null,
      qrCode: req.body.qrCode?.trim() || null,
    };

    console.log('Processed data:', emergencyData);

    // Create and save document
    const newEmergency = new EmergencyInfo(emergencyData);
    console.log('Document created, now saving...');
    
    await newEmergency.save();
    
    console.log('✅ Saved successfully:', newEmergency._id);
    res.status(201).json({ 
      message: 'Emergency info saved successfully', 
      id: newEmergency._id,
      email: newEmergency.email 
    });
  } catch (error) {
    console.error('❌ ERROR SAVING EMERGENCY INFO:', error);
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    if (error.errors) {
      console.error('Validation errors:', error.errors);
    }
    res.status(500).json({ 
      error: error.message,
      type: error.name,
      details: error.errors || 'See server logs for details'
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