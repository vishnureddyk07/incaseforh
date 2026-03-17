import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import EmergencyInfo from './models/EmergencyInfo.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import ActionLog from './models/ActionLog.js';
import Hospital from './models/Hospital.js';

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
const GEONAMES_USERNAME = process.env.GEONAMES_USERNAME || '';

// Middleware
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://10.5.12.85:5173',
    'http://10.5.12.85:5174',
    'https://incaseforh.vercel.app',
    /^https:\/\/incaseforh-[a-zA-Z0-9\-]+\.vercel\.app$/  // Match all Vercel preview/staging URLs
  ];
  const origin = req.headers.origin;
  console.log(`CORS check for origin: ${origin}`);
  const allowed = allowedOrigins.some(ao => {
    if (typeof ao === 'string') {
      return ao === origin;
    }
    return ao.test(origin);
  });
  
  if (allowed) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    console.log(`✓ CORS allowed for: ${origin}`);
  } else {
    console.log(`✗ CORS denied for: ${origin}`);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Authorization-Token');
  res.header('Access-Control-Max-Age', '3600');
  
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight');
    res.sendStatus(200);
  } else {
    next();
  }
});
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // FOR FormData PARSING

// ── Rate-limiting middleware ─────────────────────────────────────────
// Shared handler for rate-limit responses
const rateLimitHandler = (_req, res) => {
  res.status(429).json({ error: 'Too many requests — please try again later' });
};

// 1) Global baseline: 200 requests per IP per 15 min (covers all routes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});
app.use(globalLimiter);

// 2) Auth endpoints: 10 attempts per IP per 15 min (blocks brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many login attempts — please wait 15 minutes' });
  },
});

// 3) Data-creation endpoints: 15 per IP per 15 min (prevents storage spam)
const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// 4) Public data-read / QR-scan: 60 per IP per 15 min (anti-scraping)
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// 5) External-API proxy (GeoNames): 30 per IP per 15 min (billing protection)
const externalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Hospital search rate limit reached — please try again shortly' });
  },
});

// 6) SOS endpoint: generous but bounded — 5 per IP per 5 min
const sosLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'SOS rate limit reached — if this is a real emergency call 108 or 112 directly' });
  },
});
// ── End rate-limiting middleware ─────────────────────────────────────

// In-memory uploads (avoid ephemeral filesystem on Render)
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'application/pdf',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, BMP, and PDF are allowed.'));
    }
  },
});

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

// Middleware: allow admin or manager
const requireManagerOrAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// ── Sanitization helpers ──────────────────────────────────────────────

// Strip HTML tags to prevent stored XSS when data is rendered outside React
const stripHtml = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim();
};

// Ensure a value is a plain string (blocks NoSQL operator objects like {$ne:null})
const sanitizeMongoValue = (val) => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') return null;            // reject operator objects
  return String(val);
};

// Validate & sanitize the emergencyContacts array after JSON.parse
const sanitizeContacts = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c) => c && typeof c === 'object' && !Array.isArray(c))
    .map((c) => ({
      name: stripHtml(sanitizeMongoValue(c.name) || ''),
      phone: stripHtml(sanitizeMongoValue(c.phone) || ''),
    }))
    .filter((c) => c.name || c.phone);
};

// Sanitize a route/query param to a plain trimmed string
const sanitizeStringParam = (val) => {
  if (typeof val !== 'string') return '';
  return val.trim();
};

// ── End sanitization helpers ─────────────────────────────────────────

// Helper: record manager/admin actions for audit
const logAction = async ({ actor, action, details = {} }) => {
  if (!actor) return;
  try {
    await ActionLog.create({
      actorId: actor.sub || actor.id || '',
      actorEmail: actor.email,
      actorRole: actor.role,
      action,
      details,
    });
  } catch (err) {
    console.error('Failed to write action log', err.message);
  }
};

const calculateDistanceKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const fetchGeoNamesHospitals = async ({ latitude, longitude }) => {
  if (!GEONAMES_USERNAME) return [];

  const geoNamesUrl = `https://api.geonames.org/findNearbyJSON?lat=${latitude}&lng=${longitude}&featureClass=S&featureCode=HSPT&maxRows=15&username=${encodeURIComponent(GEONAMES_USERNAME)}`;
  const response = await fetch(geoNamesUrl);
  if (!response.ok) {
    throw new Error(`GeoNames request failed with ${response.status}`);
  }

  const data = await response.json();
  const geonames = data?.geonames || [];

  return geonames
    .map((place) => {
      const placeLat = Number(place.lat);
      const placeLng = Number(place.lng);
      if (Number.isNaN(placeLat) || Number.isNaN(placeLng)) {
        return null;
      }

      const distance = calculateDistanceKm(latitude, longitude, placeLat, placeLng);
      return {
        id: String(place.geonameId),
        name: place.name,
        address: place.adminName1 || 'Hospital',
        phone: undefined,
        ambulancePhone: undefined,
        type: 'hospital',
        rating: 4.2,
        distance: parseFloat(distance.toFixed(2)),
        hasAmbulance: false,
        hasICU: false,
        hasOperatingTheatre: false,
        website: undefined,
        operatingHours: undefined,
        lat: placeLat,
        lng: placeLng,
        vicinity: place.countryName || '',
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 8);
};

// Helper: Convert old file paths to base64 data URLs by fetching from production
const convertPhotoToDataUrl = async (photo) => {
  if (!photo) return null;
  
  // Already a data URL
  if (photo.startsWith('data:')) {
    return photo;
  }
  
  // Old file path like /uploads/... or full URL to production server
  try {
    console.log('Converting old photo path to data URL:', photo);
    
    // If it's already a full URL to production, use it as-is
    let photoUrl = photo;
    if (!photo.startsWith('http')) {
      // It's a relative path, prepend production URL
      photoUrl = `https://incaseforh.onrender.com${photo.startsWith('/') ? '' : '/'}${photo}`;
    }
    
    console.log('Fetching from:', photoUrl);
    
    const response = await fetch(photoUrl);
    if (!response.ok) {
      console.warn('Failed to fetch photo from production:', response.status);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    const mime = response.headers.get('content-type') || 'application/octet-stream';
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:${mime};base64,${base64}`;
    console.log('✅ Successfully converted photo to base64');
    return dataUrl;
  } catch (err) {
    console.warn('Error converting photo:', err.message);
    return null;
  }
};

// ===== COMMENTED OUT: Medical Info Extraction Function (Will be implemented later) =====
/* OCR extraction disabled intentionally. */
// ===== END COMMENTED OUT CODE =====



// Connect to MongoDB
const mongoUriEnvKey = process.env.MONGODB_URI
  ? 'MONGODB_URI'
  : process.env.MONGO_URI
    ? 'MONGO_URI'
    : process.env.MONGODB_URL
      ? 'MONGODB_URL'
      : process.env.MONGO_URL
        ? 'MONGO_URL'
    : process.env.DATABASE_URL
      ? 'DATABASE_URL'
      : null;
const MONGODB_URI = mongoUriEnvKey ? process.env[mongoUriEnvKey] : null;
let isMongoConnecting = false;
let lastMongoConnectError = null;

const connectMongoWithRetry = async () => {
  if (!MONGODB_URI || isMongoConnecting || mongoose.connection.readyState === 1) {
    return;
  }

  isMongoConnecting = true;
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    lastMongoConnectError = null;
    console.log('MongoDB connected successfully');
  } catch (err) {
    lastMongoConnectError = err instanceof Error ? err.message : String(err);
    console.error('MongoDB connection error:', lastMongoConnectError);
    setTimeout(() => {
      void connectMongoWithRetry();
    }, 5000);
  } finally {
    isMongoConnecting = false;
  }
};

if (!MONGODB_URI) {
  console.error('MongoDB URI is not set. Running in degraded mode. Define one of: MONGODB_URI, MONGO_URI, MONGODB_URL, MONGO_URL, DATABASE_URL');
} else {
  console.log(`MongoDB URI: loaded from ${mongoUriEnvKey}`);
  void connectMongoWithRetry();

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Retrying connection...');
    void connectMongoWithRetry();
  });
}

// Basic route
app.get('/', (req, res) => {
  res.send('Server is running and connected to MongoDB');
});

// ── Versioned API router ─────────────────────────────────────────────
import { Router } from 'express';
const router = Router();

// Auth: register first admin (protected by setup key or single-use if no key set)
router.post('/auth/register-admin', authLimiter, async (req, res) => {
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

// Auth: check if admin exists (for setup detection)
router.get('/admin/check', async (req, res) => {
  try {
    const adminExists = await User.exists({ role: 'admin' });
    res.json({ exists: !!adminExists });
  } catch (error) {
    console.error('Error checking admin:', error);
    res.status(500).json({ error: 'Failed to check admin status' });
  }
});

// Auth: login for admin/manager
router.post('/auth/login', authLimiter, async (req, res) => {
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

    const safeUser = sanitizeUser(user);

    // Log manager authentications for admin visibility
    if (user.role === 'manager') {
      logAction({ actor: safeUser, action: 'manager_login', details: { email: user.email } });
    }

    res.json({ token, user: safeUser });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Auth: change password (requires authentication)
router.post('/auth/change-password', requireAuth, async (req, res) => {
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

// Admin: clear all emergency records (for testing/resetting)
router.delete('/admin/emergency/clear-all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await EmergencyInfo.deleteMany({});
    res.json({ message: `Cleared ${result.deletedCount} emergency records` });
  } catch (error) {
    console.error('Error clearing emergency records:', error);
    res.status(500).json({ error: 'Failed to clear emergency records' });
  }
});

// Admin: delete a single emergency record by id
router.delete('/admin/emergency/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await EmergencyInfo.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json({ message: 'Deleted', id });
  } catch (error) {
    console.error('Error deleting emergency record:', error);
    res.status(500).json({ error: 'Failed to delete emergency record' });
  }
});

// Admin: create manager credentials
router.post('/admin/users/manager', requireAuth, requireAdmin, async (req, res) => {
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

    logAction({ actor: req.user, action: 'create_manager', details: { email: normalizedEmail } });

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('Error creating manager:', error);
    res.status(500).json({ error: 'Failed to create manager' });
  }
});

// Manager/Admin: create employee credentials (role: user)
router.post('/manager/users', requireAuth, requireManagerOrAdmin, async (req, res) => {
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
    const user = await User.create({ email: normalizedEmail, passwordHash, role: 'user' });

    await logAction({ actor: req.user, action: 'create_employee', details: { email: normalizedEmail } });

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('Error creating employee user:', error);
    res.status(500).json({ error: 'Failed to create employee user' });
  }
});

// AI: Extract medical info from document (public endpoint)
// ===== COMMENTED OUT: Medical Document Upload API Endpoint (Will be implemented later) =====
/*
app.post('/api/extract-medical-info', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    const isPdf = (req.file.mimetype || '').toLowerCase().includes('pdf');

    const fs = await import('fs');
    let extractedText = '';
    
    if (isPdf) {
      // For PDFs, we'll use a simple approach - just tell user to use images for best results
      console.log('PDF uploaded, attempting basic text extraction');
      try {
        // Try to read PDF as text (works for text-based PDFs only)
        const pdfBuffer = fs.readFileSync(req.file.path);
        extractedText = pdfBuffer.toString('utf-8');
        // Filter out binary junk
        extractedText = extractedText.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
      } catch (e) {
        console.log('PDF text extraction failed, suggesting image upload');
        fs.unlinkSync(req.file.path);
        return res.status(422).json({ 
          error: 'For best results, please convert your PDF to an image (JPG/PNG) and upload again. Screenshot or take a photo of your medical document works best!',
          suggestion: 'Use image format for accurate text recognition'
        });
      }
    } else {
      console.log('Starting OCR with Tesseract.js for:', req.file.path);
      const result = await Tesseract.recognize(req.file.path, 'eng', {
        logger: m => console.log('Tesseract progress:', m.status, m.progress)
      });
      extractedText = result.data.text || '';
    }
    console.log('Extracted text length:', extractedText.length);

    // Parse extracted text for medical fields
    const extractedData = extractMedicalInfo(extractedText);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      data: extractedData,
      message: 'Medical information extracted successfully'
    });

  } catch (error) {
    console.error('Error extracting medical info:', error);
    res.status(500).json({ error: 'Failed to extract medical information', details: error.message });
  }
});
*/
// ===== END COMMENTED OUT CODE =====

// API Routes
router.post('/emergency', createLimiter, upload.single('photo'), async (req, res) => {
  try {
    console.log('=== POST /api/emergency START ===');
    console.log('Received body:', JSON.stringify(req.body, null, 2));
    console.log('Received file:', req.file);

    // STEP 1: VALIDATION - Check required fields
    console.log('STEP 1: Validating required fields...');
    const { fullName, phoneNumber, dateOfBirth } = req.body;
    
    if (!fullName) {
      console.error('❌ VALIDATION FAILED: fullName is undefined/null');
      return res.status(400).json({ error: 'fullName is required', received: { fullName } });
    }
    if (typeof fullName !== 'string' || fullName.trim() === '') {
      console.error('❌ VALIDATION FAILED: fullName is empty or not string:', typeof fullName);
      return res.status(400).json({ error: 'fullName must be non-empty string', received: { fullName } });
    }

    if (!phoneNumber) {
      console.error('❌ VALIDATION FAILED: phoneNumber is undefined/null');
      return res.status(400).json({ error: 'phoneNumber is required', received: { phoneNumber } });
    }
    if (typeof phoneNumber !== 'string' || phoneNumber.trim() === '') {
      console.error('❌ VALIDATION FAILED: phoneNumber is empty or not string:', typeof phoneNumber);
      return res.status(400).json({ error: 'phoneNumber must be non-empty string', received: { phoneNumber } });
    }

    if (!dateOfBirth) {
      console.error('❌ VALIDATION FAILED: dateOfBirth is undefined/null');
      return res.status(400).json({ error: 'dateOfBirth is required', received: { dateOfBirth } });
    }

    console.log('✅ Required fields valid');

    // STEP 2: SAFE FIELD CONVERSION
    console.log('STEP 2: Converting fields safely...');
    const safeString = (val) => {
      if (!val) return null;
      if (typeof val === 'object') return null; // block NoSQL operator objects
      const str = String(val).trim();
      if (str === '') return null;
      return stripHtml(str);
    };

    // Convert photo to base64 data URL (persists across restarts)
    let photoDataUrl = null;
    if (req.file && req.file.buffer) {
      const mime = req.file.mimetype || 'application/octet-stream';
      const base64 = req.file.buffer.toString('base64');
      photoDataUrl = `data:${mime};base64,${base64}`;
    }

    // If phone already exists, update that card instead of failing with duplicate error.
    const normalizedPhoneNumber = safeString(phoneNumber);
    const existingByPhone = await EmergencyInfo.findOne({ phoneNumber: normalizedPhoneNumber });

    const emergencyData = {
      fullName: safeString(fullName),
      email: safeString(req.body.email) || null,
      bloodType: safeString(req.body.bloodType),
      emergencyContacts: req.body.emergencyContacts
        ? sanitizeContacts(JSON.parse(req.body.emergencyContacts))
        : [],
      allergies: safeString(req.body.allergies),
      medications: safeString(req.body.medications),
      medicalConditions: safeString(req.body.medicalConditions),
      photo: photoDataUrl,
      dateOfBirth: safeString(dateOfBirth),
      address: safeString(req.body.address),
      phoneNumber: normalizedPhoneNumber,
      qrCode: safeString(req.body.qrCode) ? (safeString(req.body.qrCode).substring(0, 500000)) : null,
    };

    console.log('✅ Fields converted:', JSON.stringify(emergencyData, null, 2));

    if (existingByPhone) {
      // Preserve existing photo when user does not upload a new one.
      emergencyData.photo = photoDataUrl || existingByPhone.photo || null;

      const updatedDoc = await EmergencyInfo.findByIdAndUpdate(
        existingByPhone._id,
        emergencyData,
        { new: true, runValidators: true }
      );

      console.log('✅ UPDATED EXISTING RECORD:', updatedDoc?._id);
      return res.status(200).json({
        message: 'Emergency info updated successfully',
        id: updatedDoc?._id,
        phoneNumber: updatedDoc?.phoneNumber,
        updated: true,
        timestamp: new Date(),
      });
    }

    // STEP 3: CREATE MODEL
    console.log('STEP 3: Creating Mongoose document...');
    const newEmergency = new EmergencyInfo(emergencyData);
    console.log('✅ Document created, schema validation passed');

    // STEP 4: SAVE TO DATABASE
    console.log('STEP 4: Saving to MongoDB...');
    
    // Always create a new record - don't use email as unique identifier
    const savedDoc = await newEmergency.save();
    
    console.log('✅ SAVED SUCCESSFULLY:', savedDoc._id);
    res.status(201).json({ 
      message: 'Emergency info saved successfully', 
      id: savedDoc._id,
      phoneNumber: savedDoc.phoneNumber,
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
    
    const isValidation = error.name === 'ValidationError';
    res.status(isValidation ? 400 : 500).json({
      error: isValidation
        ? 'Validation failed — please check your input fields'
        : 'Failed to save emergency information',
    });
  }
});

router.get('/emergency/:email', readLimiter, async (req, res) => {
  try {
    const raw = req.params.email || '';
    const decoded = (() => { try { return decodeURIComponent(raw); } catch { return raw; } })();
    const needle = sanitizeStringParam(decoded).toLowerCase();
    if (!needle) return res.status(400).json({ error: 'Email parameter is required' });
    console.log('Lookup email param:', { raw, needle });
    
    // Get scanner's IP address
    const scannerIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
    console.log('📍 QR Scanned from IP:', scannerIP);
    
    const emergency = await EmergencyInfo.findOne({ email: { $eq: needle } }).collation({ locale: 'en', strength: 2 });
    if (!emergency) {
      return res.status(404).json({ error: 'Emergency info not found' });
    }
    
    // Log the scan activity (IP + timestamp)
    try {
      await ActionLog.create({
        actorId: 'public-scan',
        actorEmail: emergency.email || emergency.phoneNumber || 'unknown',
        actorRole: 'manager',
        action: 'qr_scan',
        details: {
          scannerIP,
          scannedAt: new Date().toISOString(),
          userAgent: stripHtml(String(req.headers['user-agent'] || '').slice(0, 500)),
          victimName: emergency.fullName
        }
      });
      console.log('✅ QR scan logged to admin');
    } catch (logErr) {
      console.warn('Failed to log scan:', logErr.message);
    }

    // Avoid blocking public response by converting legacy image paths on read.
    // New records already persist photo as data URL at write time.
    
    res.json(emergency);
  } catch (error) {
    console.error('Error in GET /api/emergency/:email', error);
    res.status(500).json({ error: 'Failed to fetch emergency info' });
  }
});

// Fetch emergency info by phone number (case-insensitive exact match)
router.get('/emergency/phone/:phoneNumber', readLimiter, async (req, res) => {
  try {
    const raw = req.params.phoneNumber || '';
    const decoded = (() => { try { return decodeURIComponent(raw); } catch { return raw; } })();
    const needle = sanitizeStringParam(decoded);
    if (!needle) return res.status(400).json({ error: 'Phone number parameter is required' });
    console.log('Lookup phone param:', { raw, needle });
    
    // Get scanner's IP address
    const scannerIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
    console.log('📍 QR Scanned from IP:', scannerIP);
    
    const emergency = await EmergencyInfo.findOne({ phoneNumber: { $eq: needle } });
    if (!emergency) {
      return res.status(404).json({ error: 'Emergency info not found' });
    }
    
    // Log the scan activity (IP + timestamp)
    try {
      await ActionLog.create({
        actorId: 'public-scan',
        actorEmail: emergency.email || emergency.phoneNumber || 'unknown',
        actorRole: 'manager',
        action: 'qr_scan',
        details: {
          scannerIP,
          scannedAt: new Date().toISOString(),
          userAgent: stripHtml(String(req.headers['user-agent'] || '').slice(0, 500)),
          victimName: emergency.fullName
        }
      });
      console.log('✅ QR scan logged to admin');
    } catch (logErr) {
      console.warn('Failed to log scan:', logErr.message);
    }

    // Avoid blocking public response by converting legacy image paths on read.
    // New records already persist photo as data URL at write time.
    
    res.json(emergency);
  } catch (error) {
    console.error('Error in GET /api/emergency/phone/:phoneNumber', error);
    res.status(500).json({ error: 'Failed to fetch emergency info' });
  }
});

// PUT: Update emergency info (admin-only, QR code preserved)
router.put('/emergency/:email', requireAuth, requireAdmin, async (req, res) => {
  try {
    const raw = req.params.email || '';
    const decoded = (() => { try { return decodeURIComponent(raw); } catch { return raw; } })();
    const needle = sanitizeStringParam(decoded).toLowerCase();
    if (!needle) return res.status(400).json({ error: 'Email parameter is required' });
    
    const existing = await EmergencyInfo.findOne({ email: { $eq: needle } }).collation({ locale: 'en', strength: 2 });
    if (!existing) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // Update only whitelisted fields with sanitized string values
    const allowedFields = ['fullName', 'bloodType', 'emergencyContact', 'allergies', 
                 'medications', 'medicalConditions', 'dateOfBirth', 'phoneNumber', 'address',
                 'email'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        const safe = sanitizeMongoValue(req.body[field]);
        if (safe !== null) existing[field] = stripHtml(safe);
      }
    });

    await existing.save();
    res.json({ message: 'Record updated', record: existing });
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: 'Failed to update record' });
  }
});

// PUT: Update emergency info by phone (admin-only)
router.put('/emergency/phone/:phoneNumber', requireAuth, requireAdmin, async (req, res) => {
  try {
    const raw = req.params.phoneNumber || '';
    const decoded = (() => { try { return decodeURIComponent(raw); } catch { return raw; } })();
    const needle = sanitizeStringParam(decoded);
    if (!needle) return res.status(400).json({ error: 'Phone number parameter is required' });

    const existing = await EmergencyInfo.findOne({ phoneNumber: { $eq: needle } });
    if (!existing) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const allowedFields = ['fullName', 'bloodType', 'emergencyContact', 'allergies', 
                 'medications', 'medicalConditions', 'dateOfBirth', 'phoneNumber', 'address',
                 'email'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        const safe = sanitizeMongoValue(req.body[field]);
        if (safe !== null) existing[field] = stripHtml(safe);
      }
    });

    await existing.save();
    res.json({ message: 'Record updated', record: existing });
  } catch (error) {
    console.error('Error updating record by phone:', error);
    res.status(500).json({ error: 'Failed to update record' });
  }
});

// GET all emergency records (admin/manager) with pagination
router.get('/emergency', requireAuth, requireManagerOrAdmin, async (req, res) => {
  try {
    console.log('Fetching emergency records with pagination...');
    
    // Get pagination params from query
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20)); // Cap at 100 records per page
    const skip = (page - 1) * limit;
    
    // Count total records
    const total = await EmergencyInfo.countDocuments({});
    
    // Fetch paginated records
    const records = await EmergencyInfo.find({})
      .sort({ createdAt: -1 })
      .select('fullName email qrCode photo createdAt phoneNumber dateOfBirth address bloodType emergencyContact allergies medications medicalConditions')
      .skip(skip)
      .limit(limit)
      .lean();
    
    console.log(`Fetched ${records.length} of ${total} records (page ${page}, limit ${limit})`);
    
    // Return pagination metadata
    res.json({
      total,
      page,
      limit,
      records
    });
  } catch (error) {
    console.error('Error fetching emergency records:', error);
    res.status(500).json({ error: 'Failed to fetch emergency records' });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  if (!MONGODB_URI) {
    return res.status(503).json({
      status: 'degraded',
      mongodb: 'not-configured',
      reason: 'Set MONGODB_URI, MONGO_URI, or DATABASE_URL in deployment environment',
      timestamp: new Date(),
    });
  }
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ status: 'healthy', mongodb: 'connected', timestamp: new Date() });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', mongodb: 'disconnected' });
  }
});

// Environment check endpoint (does not leak secrets)
app.get('/env-check', (req, res) => {
  const envSet = Boolean(process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL || process.env.MONGO_URL || process.env.DATABASE_URL);
  res.json({ mongodbUriSet: envSet, acceptedKeys: ['MONGODB_URI', 'MONGO_URI', 'MONGODB_URL', 'MONGO_URL', 'DATABASE_URL'] });
});

// Public: Get nearby hospitals (location-based search)
router.get('/hospitals/nearby', externalApiLimiter, async (req, res) => {
  try {
    const { lat, lng, maxDistance = 5000 } = req.query; // maxDistance in meters, default 5km

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    // Cap maxDistance to prevent expensive geospatial scans (max 50 km)
    const safeMaxDistance = Math.min(Math.abs(parseInt(maxDistance, 10) || 5000), 50000);

    // Geospatial query to find nearby hospitals
    const hospitals = await Hospital.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: safeMaxDistance,
        },
      },
      acceptsEmergency: true,
    })
      .sort({ type: 1 }) // Prioritize trauma centers first
      .limit(10);

    // Add distance calculation for each hospital
    const hospitalsWithDistance = hospitals.map((hospital) => {
      const R = 6371; // Earth's radius in kilometers
      const dLat = (hospital.location.coordinates[1] - latitude) * (Math.PI / 180);
      const dLon = (hospital.location.coordinates[0] - longitude) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(latitude * (Math.PI / 180)) *
          Math.cos(hospital.location.coordinates[1] * (Math.PI / 180)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c; // Distance in kilometers

      return {
        id: hospital._id.toString(),
        name: hospital.name,
        address: hospital.address,
        city: hospital.city,
        phone: hospital.phone,
        ambulancePhone: hospital.ambulancePhone,
        type: hospital.type,
        rating: hospital.rating,
        distance: parseFloat(distance.toFixed(2)),
        hasAmbulance: hospital.hasAmbulance,
        hasICU: hospital.hasICU,
        hasOperatingTheatre: hospital.hasOperatingTheatre,
        website: hospital.website,
        operatingHours: hospital.operatingHours,
        lat: hospital.location.coordinates[1],
        lng: hospital.location.coordinates[0],
      };
    });

    // Sort by priority: trauma centers first, then by distance
    hospitalsWithDistance.sort((a, b) => {
      const typeOrder = { 'trauma-center': 0, government: 1, private: 2, 'nursing-home': 3 };
      if (typeOrder[a.type] !== typeOrder[b.type]) {
        return typeOrder[a.type] - typeOrder[b.type];
      }
      return a.distance - b.distance;
    });

    if (hospitalsWithDistance.length > 0) {
      return res.json(hospitalsWithDistance);
    }

    try {
      const geoNamesHospitals = await fetchGeoNamesHospitals({ latitude, longitude });
      return res.json(geoNamesHospitals);
    } catch (geoErr) {
      console.error('GeoNames fallback failed:', geoErr);
      return res.json([]);
    }
  } catch (error) {
    console.error('Error finding nearby hospitals:', error);
    res.status(500).json({ error: 'Failed to find nearby hospitals' });
  }
});

// Public: Trigger SOS alert
router.post('/sos/trigger', sosLimiter, async (req, res) => {
  try {
    const { location, timestamp, emergencyContacts, victimName, victimPhone } = req.body;

    if (!location || !timestamp) {
      return res.status(400).json({ error: 'Location and timestamp are required' });
    }

    // Log SOS event for audit
    if (emergencyContacts && Array.isArray(emergencyContacts) && emergencyContacts.length > 0) {
      const primaryContact = emergencyContacts[0];
      console.log(`🚨 SOS TRIGGERED - Victim: ${victimName || 'Unknown'} (${victimPhone || 'No phone'})`);
      console.log(`   Location: ${location.lat}, ${location.lng}`);
      console.log(`   Primary Contact: ${primaryContact.name} - ${primaryContact.phone}`);

      // TODO: Implement actual SMS/WhatsApp notifications
      // For now, just log it
      console.log(`   📱 Would send SOS notification to ${emergencyContacts.length} contacts`);
    }

    res.json({ 
      message: 'SOS triggered successfully',
      contactsNotified: emergencyContacts ? emergencyContacts.length : 0,
      timestamp 
    });
  } catch (error) {
    console.error('Error triggering SOS:', error);
    // Don't block the emergency - respond with success anyway
    res.json({ message: 'SOS recorded' });
  }
});

// Admin: Get all hospitals (for management)
router.get('/admin/hospitals', requireAuth, requireAdmin, async (req, res) => {
  try {
    const hospitals = await Hospital.find({}).sort({ type: 1, name: 1 });
    res.json(
      hospitals.map((h) => ({
        id: h._id.toString(),
        name: h.name,
        address: h.address,
        city: h.city,
        phone: h.phone,
        ambulancePhone: h.ambulancePhone,
        type: h.type,
        rating: h.rating,
        hasAmbulance: h.hasAmbulance,
        lat: h.location.coordinates[1],
        lng: h.location.coordinates[0],
      }))
    );
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    res.status(500).json({ error: 'Failed to fetch hospitals' });
  }
});

// Admin: list users (optionally filter by role)
router.get('/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.query;
    const query = {};
    const allowedRoles = ['admin', 'manager', 'user'];
    if (role) {
      const safeRole = sanitizeMongoValue(role);
      if (safeRole && allowedRoles.includes(safeRole)) {
        query.role = safeRole;
      } else {
        return res.status(400).json({ error: 'Invalid role filter' });
      }
    }
    const users = await User.find(query).select('_id email role createdAt');
    res.json(users.map(u => ({ id: u._id.toString(), email: u.email, role: u.role, createdAt: u.createdAt })));
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// Admin: delete a user (cannot delete admins or self)
router.delete('/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.sub === id) {
      return res.status(400).json({ error: 'Cannot delete own account' });
    }
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete admin accounts' });
    }
    await User.deleteOne({ _id: id });
    await logAction({ actor: req.user, action: 'delete_user', details: { id, email: user.email, role: user.role } });
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Admin: view recent manager/admin action logs
router.get('/admin/logs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
    const logs = await ActionLog.find({}).sort({ createdAt: -1 }).limit(limit);
    res.json(
      logs.map((log) => ({
        id: log._id.toString(),
        actorEmail: log.actorEmail,
        actorRole: log.actorRole,
        action: log.action,
        details: log.details,
        createdAt: log.createdAt,
      }))
    );
  } catch (error) {
    console.error('Error listing logs:', error);
    res.status(500).json({ error: 'Failed to list logs' });
  }
});

// ── Mount versioned router & backward-compat redirect ────────────────
app.use('/api/v1', (req, res, next) => {
  if (!MONGODB_URI) {
    return res.status(503).json({
      error: 'Database is not configured on this server. Please set MONGODB_URI, MONGO_URI, MONGODB_URL, MONGO_URL, or DATABASE_URL.',
      code: 'DB_NOT_CONFIGURED',
    });
  }
  if (mongoose.connection.readyState !== 1) {
    const mongoStateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    const mongoState = mongoStateMap[mongoose.connection.readyState] || 'unknown';
    return res.status(503).json({
      error: 'Database is not connected yet. Please try again shortly.',
      code: 'DB_NOT_CONNECTED',
      state: mongoState,
      retrying: isMongoConnecting,
      lastError: lastMongoConnectError,
    });
  }
  return next();
}, router);

// Backward compatibility: redirect /api/* → /api/v1/* so old clients still work
app.use('/api', (req, res, next) => {
  // Avoid infinite loop: only redirect if not already under /api/v1
  if (req.originalUrl.startsWith('/api/v1')) return next();
  const newUrl = req.originalUrl.replace(/^\/api/, '/api/v1');
  res.redirect(307, newUrl);
});
// ── End versioned router ─────────────────────────────────────────────

// Centralized upload error handler
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'Uploaded photo is too large. Maximum allowed size is 5 MB.',
      code: 'PHOTO_TOO_LARGE',
    });
  }
  if (err && err.message && err.message.startsWith('Invalid file type')) {
    return res.status(415).json({
      error: err.message,
      code: 'INVALID_FILE_TYPE',
    });
  }
  return next(err);
});

// Start server (only in non-Vercel environments)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel serverless
export default app;