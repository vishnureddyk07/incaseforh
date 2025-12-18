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
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
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

const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

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
    res.status(201).json({ message: 'Emergency info saved successfully' });
  } catch (error) {
    console.error('Error saving emergency info:', error);
    res.status(500).json({ error: error.message });
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