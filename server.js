import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import cors from 'cors';
import EmergencyInfo from './models/EmergencyInfo.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from './models/User.js';

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
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-prod';
const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY || null;

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

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

const upload = multer({ dest: 'uploads/', limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

// Helper: sanitize user payload for responses
const sanitizeUser = (user) => ({
  id: user._id.toString(),
  email: user.email,
  role: user.role,
});

// Middleware: require valid JWT
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware: require admin role
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vishnureddyau07_db_user:59uPRJVWJ978fRUp@cluster0.tahxcai.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'From ENV' : 'Using HARDCODED FALLBACK');
console.log('Connection string starts with:', MONGODB_URI.substring(0, 30) + '...');

mongoose.connect(MONGODB_URI, { 
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err.message));

// Basic route
app.get('/', (req, res) => {
  res.send('Server is running and connected to MongoDB');
});

// Auth: register first admin (protected by setup key or single-use if no key set)
app.post('/api/auth/register-admin', async (req, res) => {
  try {
    const { email, password, setupKey } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // If a setup key is configured, require it
    if (ADMIN_SETUP_KEY && setupKey !== ADMIN_SETUP_KEY) {
      return res.status(403).json({ error: 'Invalid setup key' });
    }

    // If no setup key, only allow creating the first admin
    if (!ADMIN_SETUP_KEY) {
      const adminExists = await User.exists({ role: 'admin' });
      if (adminExists) {
        return res.status(403).json({ error: 'Admin already initialized' });
      }
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email: normalizedEmail, passwordHash, role: 'admin' });

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('Error in register-admin:', error);
    res.status(500).json({ error: 'Failed to register admin' });
  }
});

// Auth: login for admin/manager
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Auth: change password (requires authentication)
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Admin: create manager credentials
app.post('/api/admin/users/manager', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email: normalizedEmail, passwordHash, role: 'manager' });
    res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('Error creating manager:', error);
    res.status(500).json({ error: 'Failed to create manager' });
  }
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

    const protocolHeader = req.headers['x-forwarded-proto'];
    const protocol = Array.isArray(protocolHeader) ? protocolHeader[0] : (protocolHeader || req.protocol);
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    const emergencyData = {
      fullName: safeString(fullName),
      email: safeString(email),
      bloodType: safeString(req.body.bloodType),
      emergencyContact: safeString(req.body.emergencyContact),
      allergies: safeString(req.body.allergies),
      medications: safeString(req.body.medications),
      medicalConditions: safeString(req.body.medicalConditions),
      photo: req.file ? `${baseUrl}/uploads/${req.file.filename}` : null,
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
    
    // Use findOneAndUpdate with upsert to update existing or create new
    const savedDoc = await EmergencyInfo.findOneAndUpdate(
      { email: emergencyData.email },
      emergencyData,
      { upsert: true, new: true, runValidators: true }
    );
    
    console.log('✅ SAVED/UPDATED SUCCESSFULLY:', savedDoc._id);
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
    const raw = req.params.email || '';
    const decoded = (() => { try { return decodeURIComponent(raw); } catch { return raw; } })();
    const needle = decoded.trim();
    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escapeRegExp(needle)}$`, 'i');
    console.log('Lookup email param:', { raw, decoded, needle });
    const emergency = await EmergencyInfo.findOne({ email: regex });
    if (!emergency) {
      return res.status(404).json({ error: 'Emergency info not found' });
    }
    res.json(emergency);
  } catch (error) {
    console.error('Error in GET /api/emergency/:email', error);
    res.status(500).json({ error: error.message });
  }
});

// GET all emergency records (admin-only)
app.get('/api/emergency', requireAuth, requireAdmin, async (req, res) => {
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

// Environment check endpoint (does not leak secrets)
app.get('/env-check', (req, res) => {
  const envSet = Boolean(process.env.MONGODB_URI);
  res.json({ mongodbUriSet: envSet });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});