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
    console.log('Received data:', req.body);
    console.log('Received file:', req.file);
    const emergencyData = {
      ...req.body,
      photo: req.file ? req.file.path : null,
      dateOfBirth: req.body.dateOfBirth || null,
    };
    console.log('Saving data:', emergencyData);
    const newEmergency = new EmergencyInfo(emergencyData);
    console.log('Created model');
    await newEmergency.save();
    console.log('Saved successfully');
    res.status(201).json({ message: 'Emergency info saved successfully', id: newEmergency._id });
  } catch (error) {
    console.error('Error saving emergency info:', error);
    console.error('Error details:', error.message, error.name, error.errors);
    res.status(500).json({ error: error.message, details: error.errors });
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});