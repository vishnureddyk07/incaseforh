import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import archiver from 'archiver';
import QRCode from 'qrcode';
import { createGzip, constants as zlibConstants } from 'node:zlib';
import EmergencyInfo from './models/EmergencyInfo.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import ActionLog from './models/ActionLog.js';
import Hospital from './models/Hospital.js';
import SosAlert from './models/SosAlert.js';
import QRSticker from './models/QRSticker.js';
import QRBatch from './models/QRBatch.js';
import { v4 as uuidv4 } from 'uuid';

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
const FRONTEND_APP_URL = (process.env.FRONTEND_APP_URL || 'https://incaseforh.vercel.app').replace(/\/+$/, '');
const BACKEND_APP_URL = (process.env.BACKEND_APP_URL || '').replace(/\/+$/, '');

const resolveFrontendUrl = (req) => {
  if (FRONTEND_APP_URL) return FRONTEND_APP_URL;
  const origin = String(req.headers.origin || '').trim();
  if (origin.startsWith('http://') || origin.startsWith('https://')) {
    return origin.replace(/\/+$/, '');
  }
  return 'https://incaseforh.vercel.app';
};

const resolveBackendUrl = (req) => {
  if (BACKEND_APP_URL) return BACKEND_APP_URL;
  return `${req.protocol}://${req.get('host')}`.replace(/\/+$/, '');
};

const redirectLegacyEmergencyInfoRoute = (req, res, next) => {
  const path = req.path || '';
  const legacyPattern = /^\/(?:emergencyinfo|emergency-info|emrgencyinfo|emrgency-info|emrgency info)\/([^/?#]+)$/i;
  const match = path.match(legacyPattern);
  if (!match) return next();

  const identifier = decodeURIComponent(match[1]);
  return res.redirect(302, `${resolveFrontendUrl(req)}/emergencyinfo/${encodeURIComponent(identifier)}`);
};

// Middleware
app.use(redirectLegacyEmergencyInfoRoute);
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://10.5.12.85:5173',
    'http://10.5.12.85:5174',
    'https://incaseforh.vercel.app',
    /^https:\/\/incaseforh-.*\.vercel\.app$/
  ];
  const origin = req.headers.origin;
  const allowed = allowedOrigins.some(ao => 
    typeof ao === 'string' ? ao === origin : ao.test(origin)
  );
  if (allowed) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
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

const setCacheHeaders = (res, { cacheControl, vary = '' } = {}) => {
  if (cacheControl) {
    res.setHeader('Cache-Control', cacheControl);
  }
  if (vary) {
    res.setHeader('Vary', vary);
  }
};

const parseListPagination = (req, { defaultLimit = null, maxLimit = 200 } = {}) => {
  const toPositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  const hasPage = req.query?.page !== undefined;
  const hasLimit = req.query?.limit !== undefined;
  if (!hasPage && !hasLimit && defaultLimit === null) {
    return { page: 1, limit: null, skip: 0, paginated: false };
  }

  const page = Math.max(toPositiveInt(req.query?.page, 1), 1);
  const requestedLimit = hasLimit ? toPositiveInt(req.query?.limit, defaultLimit || maxLimit) : defaultLimit;
  if (!requestedLimit) {
    return { page: 1, limit: null, skip: 0, paginated: false };
  }

  const limit = Math.min(requestedLimit, maxLimit);
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    paginated: true,
  };
};

const withPaginationMeta = (items, total, page, limit) => ({
  items,
  total,
  page,
  limit,
  totalPages: Math.max(Math.ceil(total / limit), 1),
});

app.use((req, res, next) => {
  const acceptEncoding = String(req.headers['accept-encoding'] || '').toLowerCase();
  if (
    req.method !== 'GET' ||
    !acceptEncoding.includes('gzip') ||
    req.path.includes('/stream/subscribe') ||
    req.path.includes('/download-zip/') ||
    req.path.includes('/download/')
  ) {
    return next();
  }

  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);
  let gzip;
  let initialized = false;

  const initCompression = () => {
    if (initialized) return;
    initialized = true;
    setCacheHeaders(res, { vary: 'Accept-Encoding' });
    res.setHeader('Content-Encoding', 'gzip');
    res.removeHeader('Content-Length');
    gzip = createGzip({ level: zlibConstants.Z_BEST_SPEED });
    gzip.on('data', (chunk) => originalWrite(chunk));
    gzip.on('end', () => originalEnd());
    gzip.on('error', (error) => {
      console.warn('Compression error:', error.message);
      try {
        originalEnd();
      } catch (_err) {
        // ignore secondary write errors
      }
    });
  };

  res.write = (chunk, encoding, callback) => {
    initCompression();
    return gzip.write(chunk, encoding, callback);
  };

  res.end = (chunk, encoding, callback) => {
    initCompression();
    if (chunk) {
      gzip.end(chunk, encoding, callback);
    } else {
      gzip.end();
    }
    return res;
  };

  return next();
});

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

const uploadedFileToDataUrl = (file) => {
  if (!file?.buffer) return null;
  const mime = file.mimetype || 'application/octet-stream';
  const base64 = file.buffer.toString('base64');
  return `data:${mime};base64,${base64}`;
};

// Helper: sanitize user payload for responses
const sanitizeUser = (user) => ({
  id: user._id.toString(),
  email: user.email,
  role: user.role,
});

// Middleware: require valid JWT
const requireAuth = (req, res, next) => {
  // First check Authorization header (for fetch/axios requests)
  let token = '';
  const authHeader = req.headers.authorization || '';
  
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    // Fallback: check query parameter (for EventSource which can't set custom headers)
    token = req.query.token;
  }
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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

// Middleware: allow police or ambulance
const requirePoliceOrAmbulance = (req, res, next) => {
  if (!req.user || (req.user.role !== 'police' && req.user.role !== 'ambulance')) {
    return res.status(403).json({ error: 'Police or ambulance access required' });
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

const normalizeOptionalString = (val, maxLen = 500) => {
  const safe = sanitizeMongoValue(val);
  if (safe === null) return '';
  return stripHtml(safe).slice(0, maxLen);
};

const normalizePhoneForComparison = (value) => String(value || '').replace(/\D/g, '');

const parsePositiveInt = (value, fallback = 0) => {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
};

const ALLOWED_QR_TYPES = new Set(['b2c', 'b2b', 'b2g']);

const formatSerialNumber = (sequence) => `INC-2026-${String(sequence).padStart(6, '0')}`;

const parseSerialSequence = (serialNumber) => {
  const match = String(serialNumber || '').match(/INC-\d{4}-(\d{6})$/);
  if (!match) return 0;
  return Number.parseInt(match[1], 10) || 0;
};

const getNextSerialSequence = async () => {
  const latestSticker = await QRSticker.findOne({})
    .sort({ serialNumber: -1 })
    .select('serialNumber')
    .lean();

  if (!latestSticker?.serialNumber) return 1;
  return parseSerialSequence(latestSticker.serialNumber) + 1;
};

const buildBatchId = async (type = 'b2c') => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateCode = `${yy}${mm}${dd}`;
  const typeCode = String(type || 'b2c').toUpperCase();

  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const batchCountToday = await QRBatch.countDocuments({
    type,
    createdAt: { $gte: dayStart, $lte: dayEnd },
  });

  let seq = batchCountToday + 1;
  let batchId = `INC-${typeCode}-${dateCode}-${String(seq).padStart(3, '0')}`;

  // Avoid rare collisions during near-simultaneous requests.
  while (await QRBatch.exists({ batchId })) {
    seq += 1;
    batchId = `INC-${typeCode}-${dateCode}-${String(seq).padStart(3, '0')}`;
  }

  return batchId;
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

// ── Real-time SOS alerts via Server-Sent Events ──────────────────────
// Set to store all connected SSE clients for broadcasting new SOS alerts
const sseClients = new Set();

const broadcastNewSosAlert = (alert) => {
  console.log(`📡 Broadcasting new SOS alert to ${sseClients.size} connected clients`);
  const sseMessage = `data: ${JSON.stringify({
    type: 'new_alert',
    alert: {
      _id: alert._id.toString(),
      victimName: alert.victimName,
      victimPhone: alert.victimPhone,
      victimBloodType: alert.victimBloodType,
      victimAllergies: alert.victimAllergies,
      victimMedications: alert.victimMedications,
      victimEmergencyContacts: alert.victimEmergencyContacts,
      responderDeviceId: alert.responderDeviceId,
      responderLocation: alert.responderLocation,
      responderLocationAccuracy: alert.responderLocationAccuracy,
      responderLocationMeta: alert.responderLocationMeta,
      responderUserAgent: alert.responderUserAgent,
      triggeredAt: alert.triggeredAt,
      status: alert.status,
    },
  })}\n\n`;
  
  sseClients.forEach((client) => {
    try {
      client.write(sseMessage);
    } catch (e) {
      console.warn('Failed to write to SSE client:', e.message);
      sseClients.delete(client);
    }
  });
};

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
    const existingUser = await User.findOne({ email: normalizedEmail }).select('_id').lean();
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
    const user = await User.findOne({ email: normalizedEmail }).select('_id email passwordHash role').lean();
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
    const existingUser = await User.findOne({ email: normalizedEmail }).select('_id').lean();
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
    const existingUser = await User.findOne({ email: normalizedEmail }).select('_id').lean();
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

// Admin: create police credentials
router.post('/admin/users/police', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail }).select('_id').lean();
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email: normalizedEmail, passwordHash, role: 'police' });

    logAction({ actor: req.user, action: 'create_police', details: { email: normalizedEmail } });

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('Error creating police user:', error);
    res.status(500).json({ error: 'Failed to create police user' });
  }
});

// Admin: create ambulance credentials
router.post('/admin/users/ambulance', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail }).select('_id').lean();
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email: normalizedEmail, passwordHash, role: 'ambulance' });

    logAction({ actor: req.user, action: 'create_ambulance', details: { email: normalizedEmail } });

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('Error creating ambulance user:', error);
    res.status(500).json({ error: 'Failed to create ambulance user' });
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
router.post('/emergency', createLimiter, upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'bloodTypeReport', maxCount: 1 },
  { name: 'prescriptionOrDischargeReport', maxCount: 1 },
  { name: 'surgicalInfoReport', maxCount: 1 },
]), async (req, res) => {
  try {
    console.log('=== POST /api/emergency START ===');
    console.log('Received body:', JSON.stringify(req.body, null, 2));
    console.log('Received files:', Object.keys(req.files || {}));

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

    const uploadedFiles = req.files || {};
    const photoFile = Array.isArray(uploadedFiles.photo) ? uploadedFiles.photo[0] : null;
    const bloodTypeReportFile = Array.isArray(uploadedFiles.bloodTypeReport) ? uploadedFiles.bloodTypeReport[0] : null;
    const prescriptionReportFile = Array.isArray(uploadedFiles.prescriptionOrDischargeReport)
      ? uploadedFiles.prescriptionOrDischargeReport[0]
      : null;
    const surgicalInfoReportFile = Array.isArray(uploadedFiles.surgicalInfoReport) ? uploadedFiles.surgicalInfoReport[0] : null;

    // Convert uploaded files to base64 data URLs (persists across restarts)
    let photoDataUrl = null;
    if (photoFile?.buffer) {
      const mime = photoFile.mimetype || 'application/octet-stream';
      const base64 = photoFile.buffer.toString('base64');
      photoDataUrl = `data:${mime};base64,${base64}`;
    }

    let bloodTypeReportDataUrl = null;
    if (bloodTypeReportFile?.buffer) {
      const mime = bloodTypeReportFile.mimetype || 'application/octet-stream';
      const base64 = bloodTypeReportFile.buffer.toString('base64');
      bloodTypeReportDataUrl = `data:${mime};base64,${base64}`;
    }

    let prescriptionReportDataUrl = null;
    if (prescriptionReportFile?.buffer) {
      const mime = prescriptionReportFile.mimetype || 'application/octet-stream';
      const base64 = prescriptionReportFile.buffer.toString('base64');
      prescriptionReportDataUrl = `data:${mime};base64,${base64}`;
    }

    let surgicalInfoReportDataUrl = null;
    if (surgicalInfoReportFile?.buffer) {
      const mime = surgicalInfoReportFile.mimetype || 'application/octet-stream';
      const base64 = surgicalInfoReportFile.buffer.toString('base64');
      surgicalInfoReportDataUrl = `data:${mime};base64,${base64}`;
    }

    // If phone already exists, update that card instead of failing with duplicate error.
    const normalizedPhoneNumber = safeString(phoneNumber);
    const existingByPhone = await EmergencyInfo.findOne({ phoneNumber: normalizedPhoneNumber })
      .select('_id photo bloodTypeReport prescriptionOrDischargeReport surgicalInfoReport')
      .lean();

    let parsedEmergencyContacts = [];
    if (req.body.emergencyContacts) {
      try {
        parsedEmergencyContacts = sanitizeContacts(JSON.parse(req.body.emergencyContacts));
      } catch {
        return res.status(400).json({ error: 'emergencyContacts must be valid JSON' });
      }
    }

    const validContacts = parsedEmergencyContacts.filter((c) => c?.name && c?.phone);
    if (validContacts.length === 0) {
      return res.status(400).json({ error: 'At least one emergency contact (name + phone) is required' });
    }

    const normalizedContactPhones = validContacts
      .map((contact) => normalizePhoneForComparison(contact.phone))
      .filter(Boolean);
    if (new Set(normalizedContactPhones).size !== normalizedContactPhones.length) {
      return res.status(400).json({ error: 'Emergency contact phone numbers must be unique' });
    }

    const normalizedPrimaryPhoneForComparison = normalizePhoneForComparison(normalizedPhoneNumber);
    if (normalizedPrimaryPhoneForComparison) {
      const hasMatchingEmergencyContact = normalizedContactPhones.some(
        (contactPhone) => contactPhone === normalizedPrimaryPhoneForComparison
      );
      if (hasMatchingEmergencyContact) {
        return res.status(400).json({ error: 'Primary phone number must be different from emergency contact numbers' });
      }
    }

    const emergencyData = {
      fullName: safeString(fullName),
      email: safeString(req.body.email) || null,
      bloodType: safeString(req.body.bloodType),
      emergencyContacts: validContacts,
      allergies: safeString(req.body.allergies),
      medications: safeString(req.body.medications),
      medicalConditions: safeString(req.body.medicalConditions),
      photo: photoDataUrl,
      bloodTypeReport: bloodTypeReportDataUrl,
      prescriptionOrDischargeReport: prescriptionReportDataUrl,
      surgicalInfoReport: surgicalInfoReportDataUrl,
      dateOfBirth: safeString(dateOfBirth),
      address: safeString(req.body.address),
      phoneNumber: normalizedPhoneNumber,
      qrCode: safeString(req.body.qrCode) ? (safeString(req.body.qrCode).substring(0, 500000)) : null,
    };

    console.log('✅ Fields converted:', JSON.stringify(emergencyData, null, 2));

    if (existingByPhone) {
      // Preserve existing photo when user does not upload a new one.
      emergencyData.photo = photoDataUrl || existingByPhone.photo || null;
      emergencyData.bloodTypeReport = bloodTypeReportDataUrl || existingByPhone.bloodTypeReport || null;
      emergencyData.prescriptionOrDischargeReport = prescriptionReportDataUrl || existingByPhone.prescriptionOrDischargeReport || null;
      emergencyData.surgicalInfoReport = surgicalInfoReportDataUrl || existingByPhone.surgicalInfoReport || null;

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
    setCacheHeaders(res, { cacheControl: 'no-store, max-age=0', vary: 'Accept, Accept-Encoding' });
    const raw = req.params.email || '';
    const decoded = (() => { try { return decodeURIComponent(raw); } catch { return raw; } })();
    const needle = sanitizeStringParam(decoded).toLowerCase();
    if (!needle) return res.status(400).json({ error: 'Email parameter is required' });
    console.log('Lookup email param:', { raw, needle });
    
    // Get scanner's IP address
    const scannerIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
    console.log('📍 QR Scanned from IP:', scannerIP);
    
    let emergency = await EmergencyInfo.findOne({ email: { $eq: needle } })
      .select('fullName email phoneNumber bloodType emergencyContacts allergies medications medicalConditions dateOfBirth address photo bloodTypeReport prescriptionOrDischargeReport surgicalInfoReport qrCode createdAt')
      .collation({ locale: 'en', strength: 2 })
      .lean();
    
    // Fallback: try lookup by ObjectId if needle looks like a MongoDB ObjectId
    if (!emergency && needle.match(/^[0-9a-f]{24}$/i)) {
      emergency = await EmergencyInfo.findById(needle)
        .select('fullName email phoneNumber bloodType emergencyContacts allergies medications medicalConditions dateOfBirth address photo bloodTypeReport prescriptionOrDischargeReport surgicalInfoReport qrCode createdAt')
        .lean();
    }
    
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
    setCacheHeaders(res, { cacheControl: 'no-store, max-age=0', vary: 'Accept, Accept-Encoding' });
    const raw = req.params.phoneNumber || '';
    const decoded = (() => { try { return decodeURIComponent(raw); } catch { return raw; } })();
    const needle = sanitizeStringParam(decoded);
    if (!needle) return res.status(400).json({ error: 'Phone number parameter is required' });
    console.log('Lookup phone param:', { raw, needle });
    
    // Get scanner's IP address
    const scannerIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
    console.log('📍 QR Scanned from IP:', scannerIP);
    
    let emergency = await EmergencyInfo.findOne({ phoneNumber: { $eq: needle } })
      .select('fullName email phoneNumber bloodType emergencyContacts allergies medications medicalConditions dateOfBirth address photo bloodTypeReport prescriptionOrDischargeReport surgicalInfoReport qrCode createdAt')
      .lean();
    
    // Fallback: try lookup by ObjectId if needle looks like a MongoDB ObjectId
    if (!emergency && needle.match(/^[0-9a-f]{24}$/i)) {
      emergency = await EmergencyInfo.findById(needle)
        .select('fullName email phoneNumber bloodType emergencyContacts allergies medications medicalConditions dateOfBirth address photo bloodTypeReport prescriptionOrDischargeReport surgicalInfoReport qrCode createdAt')
        .lean();
    }
    
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
    
    const existing = await EmergencyInfo.findOne({ email: { $eq: needle } })
      .select('fullName email phoneNumber bloodType emergencyContacts allergies medications medicalConditions dateOfBirth address photo bloodTypeReport prescriptionOrDischargeReport surgicalInfoReport qrCode')
      .collation({ locale: 'en', strength: 2 })
      .lean();
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

    const existing = await EmergencyInfo.findOne({ phoneNumber: { $eq: needle } })
      .select('fullName email phoneNumber bloodType emergencyContacts allergies medications medicalConditions dateOfBirth address photo bloodTypeReport prescriptionOrDischargeReport surgicalInfoReport qrCode')
      .lean();
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

// GET all emergency records (admin/manager)
router.get('/emergency', requireAuth, requireManagerOrAdmin, async (req, res) => {
  try {
    console.log('Fetching all emergency records...');
    const includeQr = String(req.query.includeQr || '').toLowerCase() === 'true' || String(req.query.includeQr) === '1';
    const includePhoto = String(req.query.includePhoto || '').toLowerCase() === 'true' || String(req.query.includePhoto) === '1';
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitRaw = parseInt(req.query.limit, 10);
    const hasLimit = Number.isFinite(limitRaw) && limitRaw > 0;
    const limit = hasLimit ? Math.min(limitRaw, 100) : null;
    const skip = hasLimit ? (page - 1) * limit : 0;

    const projectStage = {
      _id: 1,
      fullName: 1,
      email: 1,
      createdAt: 1,
      phoneNumber: 1,
      dateOfBirth: 1,
      address: 1,
      bloodType: 1,
      emergencyContact: 1,
      hasPhoto: {
        $gt: [
          {
            $strLenCP: {
              $ifNull: ['$photo', ''],
            },
          },
          0,
        ],
      },
    };

    if (includeQr) {
      projectStage.qrCode = 1;
    }
    if (includePhoto) {
      projectStage.photo = 1;
    }

    const pipeline = [{ $sort: { createdAt: -1 } }];
    if (hasLimit) {
      pipeline.push({ $skip: skip }, { $limit: limit });
    }
    pipeline.push({ $project: projectStage });

    const allEmergencies = await EmergencyInfo.aggregate(pipeline);
    console.log(`Found ${allEmergencies.length} records`);
    res.json(allEmergencies);
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

// Backward compatibility for older QR codes that used backend host.
app.get([
  '/emergencyinfo/:identifier',
  '/emergency-info/:identifier',
  '/emrgencyinfo/:identifier',
  '/emrgency-info/:identifier',
  '/emrgency info/:identifier',
], (req, res) => {
  const { identifier } = req.params;
  return res.redirect(302, `${resolveFrontendUrl(req)}/emergencyinfo/${encodeURIComponent(identifier)}`);
});

// Legacy QR fixer: old printed stickers may point to backend paths like /activate/:uuid.
// Forward all known legacy scan paths into the canonical API scan route.
app.get([
  '/activate/:uuid',
  '/scan/:uuid',
  '/qr/:uuid',
  '/q/:uuid',
], (req, res) => {
  const uuid = sanitizeStringParam(req.params.uuid);
  if (!uuid) {
    return res.status(400).json({ error: 'UUID is required' });
  }
  return res.redirect(302, `${resolveBackendUrl(req)}/api/v1/qr/activate/${encodeURIComponent(uuid)}`);
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
    setCacheHeaders(res, { cacheControl: 'public, max-age=120, stale-while-revalidate=300', vary: 'Accept-Encoding' });
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
      .select('_id name address city phone ambulancePhone type rating hasAmbulance hasICU hasOperatingTheatre website operatingHours location')
      .sort({ type: 1 }) // Prioritize trauma centers first
      .limit(10)
      .lean();

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

// Admin: generate a new QR sticker batch
router.post('/admin/qr/generate', requireAuth, requireAdmin, async (req, res) => {
  try {
    const quantity = parsePositiveInt(req.body?.quantity, 0);
    const requestedType = normalizeOptionalString(req.body?.type || 'b2c', 20).toLowerCase();
    const type = ALLOWED_QR_TYPES.has(requestedType) ? requestedType : 'b2c';
    const organizationName = normalizeOptionalString(req.body?.organizationName, 200);
    const notes = normalizeOptionalString(req.body?.notes, 1000);

    if (!quantity || quantity > 500) {
      return res.status(400).json({ error: 'Quantity is required and must be between 1 and 500' });
    }

    const batchId = await buildBatchId(type);
    const startSequence = await getNextSerialSequence();
    const stickers = [];
    const serialNumbers = [];
    const uuids = [];

    for (let i = 0; i < quantity; i += 1) {
      const serialNumber = formatSerialNumber(startSequence + i);
      const uuid = uuidv4();

      serialNumbers.push(serialNumber);
      uuids.push(uuid);

      stickers.push({
        uuid,
        serialNumber,
        status: 'generated',
        type,
        batchId,
      });
    }

    await QRSticker.insertMany(stickers, { ordered: true });

    await QRBatch.create({
      batchId,
      quantity,
      type,
      createdBy: req.user?.email || 'admin@unknown',
      organizationName: organizationName || '',
      notes,
    });

    return res.status(201).json({
      batchId,
      quantity,
      serialNumbers,
      uuids,
    });
  } catch (error) {
    console.error('Error generating QR batch:', error);
    return res.status(500).json({ error: 'Failed to generate QR batch' });
  }
});

// Admin: list all QR batches with aggregate stats
router.get('/admin/qr/batches', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const batches = await QRBatch.find({}).sort({ createdAt: -1 }).lean();
    const batchIds = batches.map((b) => b.batchId);
    const twoPackBatchIds = batches.filter((b) => Number(b.quantity) === 2).map((b) => b.batchId);

    const stats = await QRSticker.aggregate([
      { $match: { batchId: { $in: batchIds } } },
      {
        $group: {
          _id: '$batchId',
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0],
            },
          },
          unactivated: {
            $sum: {
              $cond: [{ $in: ['$status', ['generated', 'distributed', 'unactivated']] }, 1, 0],
            },
          },
        },
      },
    ]);

    const statsByBatch = new Map(stats.map((s) => [s._id, s]));

    let syncStatusByBatch = new Map();
    if (twoPackBatchIds.length > 0) {
      const twoPackStickers = await QRSticker.find({ batchId: { $in: twoPackBatchIds } })
        .select('batchId status activatedBy')
        .lean();

      const stickersByBatch = new Map();
      for (const sticker of twoPackStickers) {
        const list = stickersByBatch.get(sticker.batchId) || [];
        list.push(sticker);
        stickersByBatch.set(sticker.batchId, list);
      }

      syncStatusByBatch = new Map(
        twoPackBatchIds.map((batchId) => {
          const stickers = stickersByBatch.get(batchId) || [];
          const statuses = stickers.map((s) => s.status);
          const hasDeactivated = statuses.includes('deactivated');
          const activeStickers = stickers.filter((s) => s.status === 'active');
          const activeProfileIds = Array.from(
            new Set(
              activeStickers
                .map((s) => (s.activatedBy ? String(s.activatedBy) : ''))
                .filter(Boolean)
            )
          );

          let packSyncStatus = 'unactivated';
          if (hasDeactivated) {
            packSyncStatus = 'deactivated';
          } else if (activeStickers.length === 2 && activeProfileIds.length === 1) {
            packSyncStatus = 'synced';
          } else if (activeStickers.length === 2 && activeProfileIds.length > 1) {
            packSyncStatus = 'mismatch';
          } else if (activeStickers.length === 1) {
            packSyncStatus = 'partial';
          }

          return [batchId, {
            packSyncEligible: true,
            packSyncStatus,
            activeInPack: activeStickers.length,
            uniqueProfilesInPack: activeProfileIds.length,
          }];
        })
      );
    }

    const response = batches.map((batch) => {
      const stat = statsByBatch.get(batch.batchId) || { total: 0, active: 0, unactivated: 0 };
      const syncInfo =
        syncStatusByBatch.get(batch.batchId) ||
        {
          packSyncEligible: false,
          packSyncStatus: 'not-applicable',
          activeInPack: 0,
          uniqueProfilesInPack: 0,
        };
      return {
        ...batch,
        total: stat.total,
        activeCount: stat.active,
        unactivatedCount: stat.unactivated,
        ...syncInfo,
      };
    });

    return res.json(response);
  } catch (error) {
    console.error('Error listing QR batches:', error);
    return res.status(500).json({ error: 'Failed to list QR batches' });
  }
});

// Admin: get a single batch with sticker details
router.get('/admin/qr/batch/:batchId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const batchId = sanitizeStringParam(req.params.batchId);
    if (!batchId) {
      return res.status(400).json({ error: 'batchId is required' });
    }

    const batch = await QRBatch.findOne({ batchId }).lean();
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const stickers = await QRSticker.find({ batchId })
      .sort({ serialNumber: 1 })
      .populate('activatedBy', 'fullName email phoneNumber bloodType')
      .lean();

    return res.json({ batch, stickers });
  } catch (error) {
    console.error('Error fetching QR batch:', error);
    return res.status(500).json({ error: 'Failed to fetch QR batch' });
  }
});

// Admin: edit batch metadata and optional batch type
router.patch('/admin/qr/batch/:batchId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const batchId = sanitizeStringParam(req.params.batchId);
    if (!batchId) {
      return res.status(400).json({ error: 'batchId is required' });
    }

    const updates = {};
    const organizationName = normalizeOptionalString(req.body?.organizationName, 200);
    const notes = normalizeOptionalString(req.body?.notes, 1000);
    const requestedType = normalizeOptionalString(req.body?.type, 20).toLowerCase();

    if (organizationName || req.body?.organizationName === '') updates.organizationName = organizationName;
    if (notes || req.body?.notes === '') updates.notes = notes;
    if (requestedType) {
      if (!ALLOWED_QR_TYPES.has(requestedType)) {
        return res.status(400).json({ error: 'Invalid type. Use b2c, b2b, or b2g' });
      }
      updates.type = requestedType;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    const batch = await QRBatch.findOneAndUpdate({ batchId }, { $set: updates }, { new: true }).lean();
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    if (updates.type) {
      await QRSticker.updateMany({ batchId }, { $set: { type: updates.type } });
    }

    return res.json({ success: true, batch });
  } catch (error) {
    console.error('Error updating QR batch:', error);
    return res.status(500).json({ error: 'Failed to update QR batch' });
  }
});

// Admin: delete a batch and all stickers in that batch (blocks by default if active stickers exist)
router.delete('/admin/qr/batch/:batchId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const batchId = sanitizeStringParam(req.params.batchId);
    if (!batchId) {
      return res.status(400).json({ error: 'batchId is required' });
    }

    const forceDelete = String(req.query.force || '').toLowerCase() === 'true';
    const activeCount = await QRSticker.countDocuments({ batchId, status: 'active' });
    if (activeCount > 0 && !forceDelete) {
      return res.status(409).json({
        error: 'Batch has active stickers. Use force=true to delete anyway.',
        activeCount,
      });
    }

    const batch = await QRBatch.findOne({ batchId }).lean();
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const stickerDeleteResult = await QRSticker.deleteMany({ batchId });
    await QRBatch.deleteOne({ batchId });

    return res.json({
      success: true,
      batchId,
      deletedStickers: stickerDeleteResult.deletedCount || 0,
    });
  } catch (error) {
    console.error('Error deleting QR batch:', error);
    return res.status(500).json({ error: 'Failed to delete QR batch' });
  }
});

// Admin: download batch activation manifest
router.get('/admin/qr/download/:batchId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const frontendUrl = resolveFrontendUrl(req);
    const backendUrl = resolveBackendUrl(req);
    const batchId = sanitizeStringParam(req.params.batchId);
    if (!batchId) {
      return res.status(400).json({ error: 'batchId is required' });
    }

    const batch = await QRBatch.findOneAndUpdate(
      { batchId },
      { $inc: { downloadCount: 1 } },
      { new: true }
    ).lean();
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const stickers = await QRSticker.find({ batchId })
      .sort({ serialNumber: 1 })
      .select('uuid serialNumber')
      .lean();

    const payload = stickers.map((sticker) => ({
      uuid: sticker.uuid,
      serialNumber: sticker.serialNumber,
      activationUrl: `${frontendUrl}/activate/${sticker.uuid}`,
      scanUrl: `${backendUrl}/api/v1/qr/activate/${sticker.uuid}`,
    }));

    return res.json(payload);
  } catch (error) {
    console.error('Error downloading QR batch manifest:', error);
    return res.status(500).json({ error: 'Failed to download QR batch manifest' });
  }
});

// Admin: download QR batch as ZIP file with QR code images
router.get('/admin/qr/download-zip/:batchId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const frontendUrl = resolveFrontendUrl(req);
    const batchId = sanitizeStringParam(req.params.batchId);
    if (!batchId) {
      return res.status(400).json({ error: 'batchId is required' });
    }

    const batch = await QRBatch.findOneAndUpdate(
      { batchId },
      { $inc: { downloadCount: 1 } },
      { new: true }
    ).lean();
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const stickers = await QRSticker.find({ batchId })
      .sort({ serialNumber: 1 })
      .select('uuid serialNumber')
      .lean();

    if (stickers.length === 0) {
      return res.status(404).json({ error: 'No stickers found in batch' });
    }

    const zipDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const zipType = String(batch.type || 'b2c').toUpperCase();
    const zipName = `INCASE-QR-${zipType}-${batchId}-${String(stickers.length).padStart(3, '0')}PCS-${zipDate}.zip`;

    // Set response headers for ZIP file download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    // Create archiver and pipe to response
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({ error: 'Failed to create ZIP file' });
    });

    archive.pipe(res);

    // Generate QR codes for each sticker and add to ZIP
    const qrPromises = stickers.map(async (sticker) => {
      try {
        const activationUrl = `${frontendUrl}/activate/${sticker.uuid}`;
        const qrImage = await QRCode.toBuffer(activationUrl, {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          width: 300,
          margin: 2,
        });
        archive.append(qrImage, { name: `QR-${sticker.serialNumber}.png` });
      } catch (err) {
        console.error(`Error generating QR for ${sticker.uuid}:`, err);
      }
    });

    await Promise.all(qrPromises);

    // Add a README file with sticker information
    const readmeContent = `INcase Emergency QR Stickers - ${batchId}
=====================================

Total Stickers: ${stickers.length}
Generated: ${new Date().toLocaleString()}

INSTRUCTIONS:
1. Unzip this file to extract all QR code images
2. Print the QR code images on sticker sheets or labels
3. Cut the stickers and distribute to customers
4. First scan opens activation form to fill emergency details
5. Next scans open the saved emergency profile with SOS actions

STICKER DETAILS:
${stickers.map((s) => `- ${s.serialNumber}: ${s.uuid}`).join('\n')}

For support, contact INcase team.
`;
    archive.append(readmeContent, { name: 'README.txt' });

    // Finalize archive
    await archive.finalize();
  } catch (error) {
    console.error('Error downloading QR batch as ZIP:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to download QR batch as ZIP' });
    }
  }
});

// Admin: paginated/searchable sticker list for dashboard
router.get('/admin/qr/stickers', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(parsePositiveInt(req.query.page, 1), 1);
    const limit = Math.min(Math.max(parsePositiveInt(req.query.limit, 50), 1), 100);
    const status = normalizeOptionalString(req.query.status, 30).toLowerCase();
    const type = normalizeOptionalString(req.query.type, 10).toLowerCase();
    const search = normalizeOptionalString(req.query.search, 120);

    const query = {};
    if (status && status !== 'all') query.status = status;
    if (type && type !== 'all') query.type = type;
    if (search) {
      query.$or = [
        { serialNumber: { $regex: search, $options: 'i' } },
        { uuid: { $regex: search, $options: 'i' } },
        { 'assignedTo.name': { $regex: search, $options: 'i' } },
        { 'assignedTo.email': { $regex: search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      QRSticker.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('activatedBy', 'fullName email phoneNumber')
        .lean(),
      QRSticker.countDocuments(query),
    ]);

    return res.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (error) {
    console.error('Error listing QR stickers:', error);
    return res.status(500).json({ error: 'Failed to list QR stickers' });
  }
});

// Public: check activation state for a pre-printed sticker
router.get('/qr/activate/:uuid', readLimiter, async (req, res) => {
  try {
    const frontendUrl = resolveFrontendUrl(req);
    const wantsJson = String(req.query?.format || '').toLowerCase() === 'json'
      || String(req.headers.accept || '').includes('application/json');
    const uuid = sanitizeStringParam(req.params.uuid);
    if (!uuid) {
      return res.status(400).json({ error: 'UUID is required' });
    }

    const sticker = await QRSticker.findOneAndUpdate(
      { uuid },
      { $set: { lastScannedAt: new Date() }, $inc: { scanCount: 1 } },
      { new: true }
    ).lean();

    if (!sticker) {
      return res.status(404).json({ error: 'Sticker not found' });
    }

    if (sticker.status === 'deactivated') {
      const activateUrl = `${frontendUrl}/activate/${sticker.uuid}`;
      if (!wantsJson) {
        return res.redirect(302, activateUrl);
      }
      return res.status(410).json({
        status: 'deactivated',
        reason: sticker.deactivatedReason || 'This sticker has been deactivated',
        sticker,
      });
    }

    if (sticker.status === 'active' && sticker.activatedBy) {
      const activatedBy = await EmergencyInfo.findById(sticker.activatedBy)
        .select('fullName email phoneNumber dateOfBirth bloodType allergies medications medicalConditions address emergencyContacts photo bloodTypeReport prescriptionOrDischargeReport surgicalInfoReport')
        .lean();
      const identifier =
        activatedBy?.email || activatedBy?.phoneNumber || String(sticker.activatedBy);

      const redirectTo = `${frontendUrl}/activate/${sticker.uuid}`;
      if (!wantsJson) {
        return res.redirect(302, redirectTo);
      }

      return res.json({
        status: 'active',
        sticker: {
          ...sticker,
          activatedBy,
        },
        emergencyProfileUrl: `${frontendUrl}/emergencyinfo/${encodeURIComponent(identifier)}`,
        redirectTo,
      });
    }

    const activateUrl = `${frontendUrl}/activate/${sticker.uuid}`;
    if (!wantsJson) {
      return res.redirect(302, activateUrl);
    }

    return res.json({
      status: sticker.status,
      sticker,
      activateUrl,
    });
  } catch (error) {
    console.error('Error fetching sticker activation state:', error);
    return res.status(500).json({ error: 'Failed to check sticker activation status' });
  }
});

// Public: activate pre-printed sticker with emergency profile data
router.post('/qr/activate/:uuid', createLimiter, upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'bloodTypeReport', maxCount: 1 },
  { name: 'prescriptionOrDischargeReport', maxCount: 1 },
  { name: 'surgicalInfoReport', maxCount: 1 },
]), async (req, res) => {
  try {
    const frontendUrl = resolveFrontendUrl(req);
    const uuid = sanitizeStringParam(req.params.uuid);
    if (!uuid) {
      return res.status(400).json({ error: 'UUID is required' });
    }

    const sticker = await QRSticker.findOne({ uuid });
    if (!sticker) {
      return res.status(404).json({ error: 'Sticker not found' });
    }
    if (sticker.status === 'deactivated') {
      return res.status(410).json({ error: sticker.deactivatedReason || 'Sticker is deactivated' });
    }
    const isExistingActiveProfile = sticker.status === 'active' && Boolean(sticker.activatedBy);

    const fullName = normalizeOptionalString(req.body?.fullName, 200);
    const phoneNumber = normalizeOptionalString(req.body?.phoneNumber, 40);
    const dateOfBirth = normalizeOptionalString(req.body?.dateOfBirth, 40);
    const email = normalizeOptionalString(req.body?.email, 200).toLowerCase();

    const uploadedFiles = req.files || {};
    const photoFile = Array.isArray(uploadedFiles.photo) ? uploadedFiles.photo[0] : null;
    const bloodTypeReportFile = Array.isArray(uploadedFiles.bloodTypeReport) ? uploadedFiles.bloodTypeReport[0] : null;
    const prescriptionReportFile = Array.isArray(uploadedFiles.prescriptionOrDischargeReport) ? uploadedFiles.prescriptionOrDischargeReport[0] : null;
    const surgicalReportFile = Array.isArray(uploadedFiles.surgicalInfoReport) ? uploadedFiles.surgicalInfoReport[0] : null;

    let photoDataUrl = uploadedFileToDataUrl(photoFile);
    if (!photoDataUrl && typeof req.body?.photo === 'string' && req.body.photo.startsWith('data:')) {
      photoDataUrl = req.body.photo;
    }

    const bloodTypeReportDataUrl = uploadedFileToDataUrl(bloodTypeReportFile);
    const prescriptionReportDataUrl = uploadedFileToDataUrl(prescriptionReportFile);
    const surgicalReportDataUrl = uploadedFileToDataUrl(surgicalReportFile);

    let emergencyContacts = [];
    if (Array.isArray(req.body?.emergencyContacts)) {
      emergencyContacts = sanitizeContacts(req.body.emergencyContacts);
    } else if (typeof req.body?.emergencyContacts === 'string' && req.body.emergencyContacts.trim()) {
      try {
        emergencyContacts = sanitizeContacts(JSON.parse(req.body.emergencyContacts));
      } catch {
        emergencyContacts = [];
      }
    }

    const validContacts = emergencyContacts.filter((c) => c?.name && c?.phone);
    if (validContacts.length === 0) {
      return res.status(400).json({ error: 'At least one emergency contact (name + phone) is required' });
    }

    const normalizedContactPhones = validContacts
      .map((contact) => normalizePhoneForComparison(contact.phone))
      .filter(Boolean);
    if (new Set(normalizedContactPhones).size !== normalizedContactPhones.length) {
      return res.status(400).json({ error: 'Emergency contact phone numbers must be unique' });
    }

    const normalizedPrimaryPhone = normalizePhoneForComparison(phoneNumber);
    if (normalizedPrimaryPhone) {
      const hasMatchingEmergencyContact = validContacts.some(
        (contact) => normalizePhoneForComparison(contact.phone) === normalizedPrimaryPhone
      );
      if (hasMatchingEmergencyContact) {
        return res.status(400).json({ error: 'Primary phone number must be different from emergency contact numbers' });
      }
    }

    const payload = {
      fullName: fullName || 'INcase User',
      phoneNumber: phoneNumber || null,
      dateOfBirth: dateOfBirth || null,
      email: email || null,
      bloodType: normalizeOptionalString(req.body?.bloodType, 20),
      allergies: normalizeOptionalString(req.body?.allergies, 1000),
      medications: normalizeOptionalString(req.body?.medications, 1000),
      medicalConditions: normalizeOptionalString(req.body?.medicalConditions, 1000),
      emergencyContacts: validContacts,
      address: normalizeOptionalString(req.body?.address, 500),
      photo: photoDataUrl,
      bloodTypeReport: bloodTypeReportDataUrl,
      prescriptionOrDischargeReport: prescriptionReportDataUrl,
      surgicalInfoReport: surgicalReportDataUrl,
      qrCode: `${frontendUrl}/activate/${uuid}`,
    };

    let existing = null;
    if (isExistingActiveProfile) {
      existing = await EmergencyInfo.findById(sticker.activatedBy);
    }
    if (!existing) {
      existing = await EmergencyInfo.findOne(
        email ? { $or: [{ email }, { phoneNumber }] } : { phoneNumber }
      );
    }

    let emergencyInfo;
    if (existing) {
      payload.photo = photoDataUrl || existing.photo || null;
      payload.bloodTypeReport = bloodTypeReportDataUrl || existing.bloodTypeReport || null;
      payload.prescriptionOrDischargeReport = prescriptionReportDataUrl || existing.prescriptionOrDischargeReport || null;
      payload.surgicalInfoReport = surgicalReportDataUrl || existing.surgicalInfoReport || null;
      emergencyInfo = await EmergencyInfo.findByIdAndUpdate(existing._id, payload, {
        new: true,
        runValidators: true,
      });
    } else {
      emergencyInfo = await EmergencyInfo.create(payload);
    }

    if (sticker.status !== 'active' || String(sticker.activatedBy || '') !== String(emergencyInfo._id)) {
      sticker.status = 'active';
      sticker.activatedBy = emergencyInfo._id;
      if (!sticker.activatedAt) sticker.activatedAt = new Date();
      if (sticker.deactivatedAt) sticker.deactivatedAt = null;
      if (sticker.deactivatedReason) sticker.deactivatedReason = '';
      await sticker.save();
    }

    let packSync = { enabled: false, syncedCount: 0, skippedCount: 0 };
    const batchMeta = await QRBatch.findOne({ batchId: sticker.batchId }).select('batchId quantity').lean();
    const shouldSyncTwoStickerPack = Number(batchMeta?.quantity || 0) === 2;

    if (shouldSyncTwoStickerPack) {
      const siblings = await QRSticker.find({
        batchId: sticker.batchId,
        uuid: { $ne: sticker.uuid },
      })
        .select('_id status activatedBy')
        .lean();

      const syncableSiblingIds = siblings
        .filter((sibling) => {
          if (sibling.status === 'deactivated') return false;
          if (!sibling.activatedBy) return true;
          return String(sibling.activatedBy) === String(emergencyInfo._id);
        })
        .map((sibling) => sibling._id);

      if (syncableSiblingIds.length > 0) {
        await QRSticker.updateMany(
          { _id: { $in: syncableSiblingIds } },
          {
            $set: {
              status: 'active',
              activatedBy: emergencyInfo._id,
              activatedAt: new Date(),
              deactivatedAt: null,
              deactivatedReason: '',
            },
          }
        );
      }

      packSync = {
        enabled: true,
        syncedCount: syncableSiblingIds.length,
        skippedCount: Math.max(siblings.length - syncableSiblingIds.length, 0),
      };
    }

    // Use email/phone for profile URL, with ObjectId as fallback
    const profileIdentifier = emergencyInfo.email || emergencyInfo.phoneNumber || emergencyInfo._id.toString();

    return res.status(isExistingActiveProfile ? 200 : 201).json({
      success: true,
      mode: isExistingActiveProfile ? 'updated' : 'activated',
      emergencyInfo,
      sticker,
      packSync,
      profileUrl: `${frontendUrl}/emergencyinfo/${encodeURIComponent(profileIdentifier)}`,
    });
  } catch (error) {
    console.error('Error activating sticker:', error);
    return res.status(500).json({ error: 'Failed to activate sticker' });
  }
});

// Admin: deactivate a sticker
router.post('/admin/qr/deactivate/:uuid', requireAuth, requireAdmin, async (req, res) => {
  try {
    const uuid = sanitizeStringParam(req.params.uuid);
    const reason = normalizeOptionalString(req.body?.deactivatedReason, 500);
    if (!uuid) {
      return res.status(400).json({ error: 'UUID is required' });
    }

    const sticker = await QRSticker.findOneAndUpdate(
      { uuid },
      {
        $set: {
          status: 'deactivated',
          deactivatedAt: new Date(),
          deactivatedReason: reason || 'Deactivated by admin',
        },
      },
      { new: true }
    );

    if (!sticker) {
      return res.status(404).json({ error: 'Sticker not found' });
    }

    return res.json({ success: true, sticker });
  } catch (error) {
    console.error('Error deactivating sticker:', error);
    return res.status(500).json({ error: 'Failed to deactivate sticker' });
  }
});

// Admin: reactivate a previously deactivated sticker
router.post('/admin/qr/reactivate/:uuid', requireAuth, requireAdmin, async (req, res) => {
  try {
    const uuid = sanitizeStringParam(req.params.uuid);
    if (!uuid) {
      return res.status(400).json({ error: 'UUID is required' });
    }

    const sticker = await QRSticker.findOne({ uuid });
    if (!sticker) {
      return res.status(404).json({ error: 'Sticker not found' });
    }

    // If profile exists, restore active; otherwise keep it usable as unactivated.
    sticker.status = sticker.activatedBy ? 'active' : 'unactivated';
    sticker.deactivatedAt = null;
    sticker.deactivatedReason = '';
    await sticker.save();

    return res.json({ success: true, sticker });
  } catch (error) {
    console.error('Error reactivating sticker:', error);
    return res.status(500).json({ error: 'Failed to reactivate sticker' });
  }
});

// Admin: reassign an existing sticker for another user/organization
router.post('/admin/qr/reassign/:uuid', requireAuth, requireAdmin, async (req, res) => {
  try {
    const uuid = sanitizeStringParam(req.params.uuid);
    if (!uuid) {
      return res.status(400).json({ error: 'UUID is required' });
    }

    const assignedTo = {
      name: normalizeOptionalString(req.body?.name, 200),
      email: normalizeOptionalString(req.body?.email, 200),
      phone: normalizeOptionalString(req.body?.phone, 40),
      organizationName: normalizeOptionalString(req.body?.organizationName, 200),
    };

    const sticker = await QRSticker.findOneAndUpdate(
      { uuid },
      {
        $set: {
          status: 'unactivated',
          assignedTo,
          activatedBy: null,
          activatedAt: null,
          deactivatedAt: null,
          deactivatedReason: '',
        },
      },
      { new: true }
    );

    if (!sticker) {
      return res.status(404).json({ error: 'Sticker not found' });
    }

    return res.json({ success: true, sticker });
  } catch (error) {
    console.error('Error reassigning sticker:', error);
    return res.status(500).json({ error: 'Failed to reassign sticker' });
  }
});

// Admin: fetch sticker + linked emergency profile for reassign edit page
router.get('/admin/qr/reassign/:uuid', requireAuth, requireAdmin, async (req, res) => {
  try {
    const uuid = sanitizeStringParam(req.params.uuid);
    if (!uuid) {
      return res.status(400).json({ error: 'UUID is required' });
    }

    const sticker = await QRSticker.findOne({ uuid })
      .populate('activatedBy', 'fullName email phoneNumber dateOfBirth bloodType allergies medications medicalConditions address emergencyContacts photo bloodTypeReport prescriptionOrDischargeReport surgicalInfoReport')
      .lean();

    if (!sticker) {
      return res.status(404).json({ error: 'Sticker not found' });
    }

    return res.json({
      success: true,
      sticker,
      emergencyInfo: sticker.activatedBy || null,
    });
  } catch (error) {
    console.error('Error fetching reassign profile:', error);
    return res.status(500).json({ error: 'Failed to fetch sticker profile' });
  }
});

// Admin: update linked emergency profile for a sticker
router.patch('/admin/qr/reassign/:uuid', requireAuth, requireAdmin, upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'bloodTypeReport', maxCount: 1 },
  { name: 'prescriptionOrDischargeReport', maxCount: 1 },
  { name: 'surgicalInfoReport', maxCount: 1 },
]), async (req, res) => {
  try {
    const uuid = sanitizeStringParam(req.params.uuid);
    if (!uuid) {
      return res.status(400).json({ error: 'UUID is required' });
    }

    const sticker = await QRSticker.findOne({ uuid });
    if (!sticker) {
      return res.status(404).json({ error: 'Sticker not found' });
    }

    if (!sticker.activatedBy) {
      return res.status(400).json({ error: 'This sticker does not have an activated profile yet' });
    }

    const emergencyInfo = await EmergencyInfo.findById(sticker.activatedBy);
    if (!emergencyInfo) {
      return res.status(404).json({ error: 'Linked emergency profile not found' });
    }

    const normalizedEmail = normalizeOptionalString(req.body?.email, 200).toLowerCase();
    const uploadedFiles = req.files || {};
    const photoFile = Array.isArray(uploadedFiles.photo) ? uploadedFiles.photo[0] : null;
    const bloodTypeReportFile = Array.isArray(uploadedFiles.bloodTypeReport) ? uploadedFiles.bloodTypeReport[0] : null;
    const prescriptionReportFile = Array.isArray(uploadedFiles.prescriptionOrDischargeReport) ? uploadedFiles.prescriptionOrDischargeReport[0] : null;
    const surgicalReportFile = Array.isArray(uploadedFiles.surgicalInfoReport) ? uploadedFiles.surgicalInfoReport[0] : null;

    const photoDataUrl = uploadedFileToDataUrl(photoFile);
    const bloodTypeReportDataUrl = uploadedFileToDataUrl(bloodTypeReportFile);
    const prescriptionReportDataUrl = uploadedFileToDataUrl(prescriptionReportFile);
    const surgicalReportDataUrl = uploadedFileToDataUrl(surgicalReportFile);

    emergencyInfo.fullName = normalizeOptionalString(req.body?.fullName, 200) || emergencyInfo.fullName || 'INcase User';
    emergencyInfo.phoneNumber = normalizeOptionalString(req.body?.phoneNumber, 40);
    emergencyInfo.dateOfBirth = normalizeOptionalString(req.body?.dateOfBirth, 40);
    emergencyInfo.email = normalizedEmail || '';
    emergencyInfo.bloodType = normalizeOptionalString(req.body?.bloodType, 20);
    emergencyInfo.allergies = normalizeOptionalString(req.body?.allergies, 1000);
    emergencyInfo.medications = normalizeOptionalString(req.body?.medications, 1000);
    emergencyInfo.medicalConditions = normalizeOptionalString(req.body?.medicalConditions, 1000);
    emergencyInfo.address = normalizeOptionalString(req.body?.address, 500);
    if (photoDataUrl) {
      emergencyInfo.photo = photoDataUrl;
    } else if (typeof req.body?.photo === 'string') {
      const incomingPhoto = req.body.photo.trim();
      if (!incomingPhoto) {
        emergencyInfo.photo = '';
      } else if (incomingPhoto.startsWith('data:') || incomingPhoto.startsWith('http')) {
        emergencyInfo.photo = incomingPhoto;
      }
    }

    if (bloodTypeReportDataUrl) {
      emergencyInfo.bloodTypeReport = bloodTypeReportDataUrl;
    } else if (typeof req.body?.bloodTypeReport === 'string') {
      const incomingBloodTypeReport = req.body.bloodTypeReport.trim();
      emergencyInfo.bloodTypeReport = incomingBloodTypeReport;
    }

    if (prescriptionReportDataUrl) {
      emergencyInfo.prescriptionOrDischargeReport = prescriptionReportDataUrl;
    } else if (typeof req.body?.prescriptionOrDischargeReport === 'string') {
      const incomingPrescription = req.body.prescriptionOrDischargeReport.trim();
      emergencyInfo.prescriptionOrDischargeReport = incomingPrescription;
    }

    if (surgicalReportDataUrl) {
      emergencyInfo.surgicalInfoReport = surgicalReportDataUrl;
    } else if (typeof req.body?.surgicalInfoReport === 'string') {
      const incomingSurgical = req.body.surgicalInfoReport.trim();
      emergencyInfo.surgicalInfoReport = incomingSurgical;
    }

    if (Array.isArray(req.body?.emergencyContacts)) {
      emergencyInfo.emergencyContacts = sanitizeContacts(req.body.emergencyContacts);
    } else if (typeof req.body?.emergencyContacts === 'string' && req.body.emergencyContacts.trim()) {
      try {
        emergencyInfo.emergencyContacts = sanitizeContacts(JSON.parse(req.body.emergencyContacts));
      } catch {
        // Leave existing contacts unchanged for malformed payloads.
      }
    }

    await emergencyInfo.save();

    return res.json({
      success: true,
      message: 'Emergency profile updated',
      emergencyInfo,
    });
  } catch (error) {
    console.error('Error updating reassign profile:', error);
    return res.status(500).json({ error: 'Failed to update sticker profile' });
  }
});

// Admin: overall sticker statistics + recent activations
router.get('/admin/qr/stats', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [statusRows, typeRows, recentActivations] = await Promise.all([
      QRSticker.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      QRSticker.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      QRSticker.find({ status: 'active', activatedAt: { $ne: null } })
        .sort({ activatedAt: -1 })
        .limit(10)
        .populate('activatedBy', 'fullName email phoneNumber bloodType')
        .lean(),
    ]);

    const countByStatus = Object.fromEntries(statusRows.map((r) => [r._id, r.count]));
    const countByType = Object.fromEntries(typeRows.map((r) => [r._id, r.count]));

    const totalGenerated =
      (countByStatus.generated || 0) +
      (countByStatus.distributed || 0) +
      (countByStatus.unactivated || 0) +
      (countByStatus.active || 0) +
      (countByStatus.deactivated || 0);

    return res.json({
      totalGenerated,
      totalActive: countByStatus.active || 0,
      totalUnactivated:
        (countByStatus.generated || 0) +
        (countByStatus.distributed || 0) +
        (countByStatus.unactivated || 0),
      totalDeactivated: countByStatus.deactivated || 0,
      byType: {
        b2c: countByType.b2c || 0,
        b2b: countByType.b2b || 0,
        b2g: countByType.b2g || 0,
      },
      recentActivations,
    });
  } catch (error) {
    console.error('Error fetching QR stats:', error);
    return res.status(500).json({ error: 'Failed to fetch QR stats' });
  }
});

// Police/Ambulance: Get all active SOS alerts
router.get('/sos', requireAuth, requirePoliceOrAmbulance, async (req, res) => {
  try {
    setCacheHeaders(res, { cacheControl: 'private, max-age=10, stale-while-revalidate=20', vary: 'Authorization, Accept-Encoding' });
    const alerts = await SosAlert.find({})
      .select('_id victimName victimPhone victimBloodType victimAllergies victimMedications victimEmergencyContacts responderDeviceId responderLocation responderLocationAccuracy responderLocationMeta triggeredAt status cancelledAt resolvedAt closedByRole closedByEmail')
      .sort({ triggeredAt: -1 })
      .lean();
    return res.json(alerts);
  } catch (error) {
    console.error('Error fetching SOS alerts:', error);
    return res.status(500).json({ error: 'Failed to fetch SOS alerts' });
  }
});

// Public: Trigger SOS alert
router.post('/sos/trigger', sosLimiter, async (req, res) => {
  try {
    const {
      victimName,
      victimPhone,
      victimBloodType,
      victimAllergies,
      victimMedications,
      victimEmergencyContacts,
      responderDeviceId,
      responderLocation,
      responderLocationAccuracy,
      responderLocationMeta,
      responderUserAgent,
      triggeredAt,
    } = req.body || {};

    const lat = Number(responderLocation?.lat);
    const lng = Number(responderLocation?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'Responder location with valid lat and lng is required' });
    }

    const safeEmergencyContacts = Array.isArray(victimEmergencyContacts)
      ? victimEmergencyContacts
          .filter((c) => c && typeof c === 'object' && !Array.isArray(c))
          .map((c) => ({
            name: stripHtml(sanitizeMongoValue(c.name) || ''),
            phone: stripHtml(sanitizeMongoValue(c.phone) || ''),
            relationship: stripHtml(sanitizeMongoValue(c.relationship) || ''),
          }))
      : [];

    const alert = await SosAlert.create({
      victimName: stripHtml(sanitizeMongoValue(victimName) || ''),
      victimPhone: stripHtml(sanitizeMongoValue(victimPhone) || ''),
      victimBloodType: stripHtml(sanitizeMongoValue(victimBloodType) || ''),
      victimAllergies: stripHtml(sanitizeMongoValue(victimAllergies) || ''),
      victimMedications: stripHtml(sanitizeMongoValue(victimMedications) || ''),
      victimEmergencyContacts: safeEmergencyContacts,
      responderDeviceId: stripHtml(sanitizeMongoValue(responderDeviceId) || ''),
      responderLocation: { lat, lng },
      responderLocationAccuracy: Number.isFinite(Number(responderLocationAccuracy))
        ? Number(responderLocationAccuracy)
        : null,
      responderLocationMeta: {
        altitude: Number.isFinite(Number(responderLocationMeta?.altitude))
          ? Number(responderLocationMeta.altitude)
          : null,
        heading: Number.isFinite(Number(responderLocationMeta?.heading))
          ? Number(responderLocationMeta.heading)
          : null,
        speed: Number.isFinite(Number(responderLocationMeta?.speed))
          ? Number(responderLocationMeta.speed)
          : null,
        capturedAt: responderLocationMeta?.capturedAt ? new Date(responderLocationMeta.capturedAt) : null,
      },
      responderUserAgent: stripHtml(sanitizeMongoValue(responderUserAgent) || ''),
      responderIP: req.ip || '',
      triggeredAt: triggeredAt ? new Date(triggeredAt) : new Date(),
      status: 'active',
    });

    await ActionLog.create({
      actorId: 'public',
      actorEmail: 'public@anonymous',
      actorRole: 'public',
      action: 'sos_trigger',
      details: {
        alertId: alert._id.toString(),
        victimName: alert.victimName,
        victimPhone: alert.victimPhone,
        responderLocation: alert.responderLocation,
      },
    });

    console.log(`🚨 SOS TRIGGERED - Alert ${alert._id.toString()}`);
    console.log(`   Victim: ${alert.victimName || 'Unknown'} (${alert.victimPhone || 'No phone'})`);
    console.log(`   Location: ${lat}, ${lng}`);

    // Broadcast to all connected SSE clients immediately
    broadcastNewSosAlert(alert);

    return res.status(201).json(alert);
  } catch (error) {
    console.error('Error triggering SOS:', error);
    return res.status(500).json({ error: 'Failed to trigger SOS alert' });
  }
});

// Police/Ambulance: close an active SOS case
router.patch('/sos/:id/close', requireAuth, requirePoliceOrAmbulance, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid alert ID' });
    }

    const updated = await SosAlert.findOneAndUpdate(
      { _id: id, status: 'active' },
      {
        $set: {
          status: 'resolved',
          resolvedAt: new Date(),
          closedByRole: req.user?.role || '',
          closedByEmail: req.user?.email || '',
        },
      },
      { new: true }
    );

    if (!updated) {
      const existing = await SosAlert.findById(id).lean();
      if (!existing) {
        return res.status(404).json({ error: 'SOS alert not found' });
      }
      return res.status(409).json({ error: 'This SOS case is already closed' });
    }

    await logAction({
      actor: req.user,
      action: 'sos_close',
      details: {
        alertId: updated._id.toString(),
        closedBy: req.user?.email || '',
      },
    });

    // Broadcast alert status update to all connected clients
    console.log(`📡 Broadcasting SOS alert status update to ${sseClients.size} connected clients`);
    const updateMessage = `data: ${JSON.stringify({
      type: 'alert_updated',
      alert: {
        _id: updated._id.toString(),
        status: updated.status,
        resolvedAt: updated.resolvedAt,
        closedByRole: updated.closedByRole,
        closedByEmail: updated.closedByEmail,
      },
    })}\n\n`;
    
    sseClients.forEach((client) => {
      try {
        client.write(updateMessage);
      } catch (e) {
        sseClients.delete(client);
      }
    });

    return res.json(updated);
  } catch (error) {
    console.error('Error closing SOS case:', error);
    return res.status(500).json({ error: 'Failed to close SOS case' });
  }
});

// Public: get SOS alert by id for police and ambulance pages
router.get('/sos/:id', readLimiter, async (req, res) => {
  try {
    setCacheHeaders(res, { cacheControl: 'private, max-age=10, stale-while-revalidate=20', vary: 'Accept, Accept-Encoding' });
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid alert ID' });
    }
    const alert = await SosAlert.findById(id)
      .select('_id victimName victimPhone victimBloodType victimAllergies victimMedications victimEmergencyContacts responderDeviceId responderLocation responderLocationAccuracy responderLocationMeta triggeredAt status cancelledAt resolvedAt closedByRole closedByEmail')
      .lean();
    if (!alert) {
      return res.status(404).json({ error: 'SOS alert not found' });
    }
    return res.json(alert);
  } catch (error) {
    console.error('Error fetching SOS alert:', error);
    return res.status(500).json({ error: 'Failed to fetch SOS alert' });
  }
});

// Real-time SOS alerts stream (Server-Sent Events)
// Police/Ambulance: Subscribe to real-time SOS alerts
router.get('/sos/stream/subscribe', requireAuth, requirePoliceOrAmbulance, (req, res) => {
  console.log(`📡 [SSE] New subscriber connected: ${req.user?.email}`);
  
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Send initial connection confirmation
  res.write(`:Connected - ready for real-time SOS alerts\n\n`);
  
  // Add this response object to the clients set
  sseClients.add(res);
  
  // Keep-alive: send periodic heartbeat to prevent connection timeout
  const heartbeat = setInterval(() => {
    try {
      res.write(':heartbeat\n\n');
    } catch (e) {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 30000); // Every 30 seconds
  
  // Clean up when client disconnects
  req.on('close', () => {
    console.log(`📡 [SSE] Subscriber disconnected: ${req.user?.email}`);
    clearInterval(heartbeat);
    sseClients.delete(res);
    res.end();
  });
  
  req.on('error', (err) => {
    console.warn(`📡 [SSE] Error from subscriber ${req.user?.email}:`, err.message);
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// Admin: Get all hospitals (for management)
router.get('/admin/hospitals', requireAuth, requireAdmin, async (req, res) => {
  try {
    setCacheHeaders(res, { cacheControl: 'private, max-age=120, stale-while-revalidate=300', vary: 'Authorization, Accept-Encoding' });
    const hospitals = await Hospital.find({})
      .select('_id name address city phone ambulancePhone type rating hasAmbulance location')
      .sort({ type: 1, name: 1 })
      .lean();
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
    const pageRequested = req.query.page !== undefined;
    const page = Math.max(parsePositiveInt(req.query.page, 1), 1);
    const limit = Math.min(Math.max(parsePositiveInt(req.query.limit, 100), 1), 200);
    const skip = (page - 1) * limit;
    setCacheHeaders(res, { cacheControl: 'private, max-age=60, stale-while-revalidate=120', vary: 'Authorization, Accept-Encoding' });
    if (pageRequested) {
      const [users, total] = await Promise.all([
        User.find(query).select('_id email role createdAt').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        User.countDocuments(query),
      ]);
      return res.json(withPaginationMeta(users.map(u => ({ id: u._id.toString(), email: u.email, role: u.role, createdAt: u.createdAt })), total, page, limit));
    }

    const queryBuilder = User.find(query).select('_id email role createdAt').sort({ createdAt: -1 });
    if (req.query.limit !== undefined) {
      queryBuilder.limit(limit);
    }
    const users = await queryBuilder.lean();
    return res.json(users.map(u => ({ id: u._id.toString(), email: u.email, role: u.role, createdAt: u.createdAt })));
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
    const user = await User.findById(id).select('_id email role').lean();
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
    const pageRequested = req.query.page !== undefined;
    const page = Math.max(parsePositiveInt(req.query.page, 1), 1);
    const limit = Math.min(Math.max(parsePositiveInt(req.query.limit, 100), 1), 200);
    const skip = (page - 1) * limit;
    setCacheHeaders(res, { cacheControl: 'private, max-age=30, stale-while-revalidate=60', vary: 'Authorization, Accept-Encoding' });
    if (pageRequested) {
      const [logs, total] = await Promise.all([
        ActionLog.find({})
          .select('_id actorEmail actorRole action details createdAt')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ActionLog.countDocuments({}),
      ]);
      return res.json(withPaginationMeta(
        logs.map((log) => ({
          id: log._id.toString(),
          actorEmail: log.actorEmail,
          actorRole: log.actorRole,
          action: log.action,
          details: log.details,
          createdAt: log.createdAt,
        })),
        total,
        page,
        limit
      ));
    }

    const logs = await ActionLog.find({})
      .select('_id actorEmail actorRole action details createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json(
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

// Admin/Manager: view recent chatbot OTP events for support verification
router.get('/otp/logs', requireAuth, requireManagerOrAdmin, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parsePositiveInt(req.query.limit, 50), 1), 200);
    const logs = await ActionLog.find({ action: 'chatbot_otp_sent' })
      .select('_id actorEmail actorRole action details createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json(
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
    console.error('Error listing OTP logs:', error);
    res.status(500).json({ error: 'Failed to list OTP logs' });
  }
});

// ── CHATBOT: OTP-based QR data modification endpoints ──────────────────

// In-memory OTP storage (keyed by phone number)
// In production, consider using Redis or a short-lived DB collection
const otpStorage = new Map();
const OTP_VALIDITY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_LENGTH = 6;

// Helper: Generate random OTP
const generateOTP = () => {
  return Math.floor(Math.random() * Math.pow(10, OTP_LENGTH))
    .toString()
    .padStart(OTP_LENGTH, '0');
};

// Chatbot: Send OTP to phone number
router.post('/chatbot/send-otp', createLimiter, async (req, res) => {
  try {
    const phoneNumber = normalizeOptionalString(req.body?.phoneNumber, 40);
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Check if user exists with this phone number
    const emergency = await EmergencyInfo.findOne({ phoneNumber })
      .select('_id fullName phoneNumber email')
      .lean();
    
    if (!emergency) {
      // Don't reveal whether phone exists (security)
      return res.status(404).json({ error: 'No profile found with this phone number' });
    }

    // Generate OTP and store it
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_VALIDITY_MS);
    
    otpStorage.set(phoneNumber, {
      otp,
      expiresAt,
      emergencyInfoId: emergency._id.toString(),
      attempts: 0,
    });

    await logAction({
      actor: { email: 'chatbot@system', role: 'system' },
      action: 'chatbot_otp_sent',
      details: {
        phoneNumber,
        otp,
        emergencyInfoId: emergency._id.toString(),
        expiresAt: expiresAt.toISOString(),
      },
    });

    // TODO: In production, send OTP via SMS service (Twilio, AWS SNS, etc.)
    // For now, log it for development
    console.log(`📱 OTP sent to ${phoneNumber}: ${otp}`);

    res.status(200).json({
      message: 'OTP sent successfully',
      phoneNumber,
      // TODO: Remove in production - only for development
      ...(process.env.NODE_ENV === 'development' && { otp, expiresIn: '5 minutes' }),
    });
  } catch (error) {
    console.error('Error in send-otp:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Chatbot: Verify OTP
router.post('/chatbot/verify-otp', createLimiter, async (req, res) => {
  try {
    const phoneNumber = normalizeOptionalString(req.body?.phoneNumber, 40);
    const otp = normalizeOptionalString(req.body?.otp, 10);

    if (!phoneNumber || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }

    const otpData = otpStorage.get(phoneNumber);
    
    if (!otpData) {
      return res.status(404).json({ error: 'OTP not found or expired' });
    }

    // Check if OTP has expired
    if (new Date() > otpData.expiresAt) {
      otpStorage.delete(phoneNumber);
      return res.status(410).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Check maximum attempts (3 attempts per OTP)
    if (otpData.attempts >= 3) {
      otpStorage.delete(phoneNumber);
      return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new OTP.' });
    }

    // Verify OTP
    if (otp !== otpData.otp) {
      otpData.attempts += 1;
      return res.status(401).json({ 
        error: 'Incorrect OTP',
        attemptsLeft: 3 - otpData.attempts
      });
    }

    // OTP verified! Generate a session token
    const emergencyInfo = await EmergencyInfo.findById(otpData.emergencyInfoId)
      .select('_id phoneNumber email fullName')
      .lean();

    // Create a temporary access token (valid for 1 hour)
    const accessToken = jwt.sign(
      {
        sub: emergencyInfo._id.toString(),
        phoneNumber: emergencyInfo.phoneNumber,
        email: emergencyInfo.email,
        role: 'self',
        type: 'chatbot-edit-session',
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Clear OTP after successful verification
    otpStorage.delete(phoneNumber);

    res.status(200).json({
      message: 'OTP verified successfully',
      accessToken,
      profileId: emergencyInfo._id.toString(),
      fullName: emergencyInfo.fullName,
      phoneNumber: emergencyInfo.phoneNumber,
      email: emergencyInfo.email,
    });
  } catch (error) {
    console.error('Error in verify-otp:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Chatbot: Get profile data by phone (after OTP verification)
// Uses custom token from chatbot/verify-otp
const requireChatbotAuth = (req, res, next) => {
  let token = '';
  const authHeader = req.headers.authorization || '';
  
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - OTP verification required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type !== 'chatbot-edit-session') {
      return res.status(403).json({ error: 'Invalid token type' });
    }
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

router.get('/chatbot/profile', requireChatbotAuth, async (req, res) => {
  try {
    const emergencyInfo = await EmergencyInfo.findById(req.user.sub)
      .select('fullName email phoneNumber dateOfBirth bloodType allergies medications medicalConditions address emergencyContacts photo bloodTypeReport prescriptionOrDischargeReport surgicalInfoReport')
      .lean();

    if (!emergencyInfo) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(emergencyInfo);
  } catch (error) {
    console.error('Error fetching chatbot profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Chatbot: Update profile data (after OTP verification)
router.patch('/chatbot/profile', requireChatbotAuth, upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'bloodTypeReport', maxCount: 1 },
  { name: 'prescriptionOrDischargeReport', maxCount: 1 },
  { name: 'surgicalInfoReport', maxCount: 1 },
]), async (req, res) => {
  try {
    const uploadedFiles = req.files || {};
    
    const updates = {
      fullName: normalizeOptionalString(req.body?.fullName, 200),
      email: normalizeOptionalString(req.body?.email, 200).toLowerCase(),
      dateOfBirth: normalizeOptionalString(req.body?.dateOfBirth, 40),
      bloodType: normalizeOptionalString(req.body?.bloodType, 20),
      allergies: normalizeOptionalString(req.body?.allergies, 1000),
      medications: normalizeOptionalString(req.body?.medications, 1000),
      medicalConditions: normalizeOptionalString(req.body?.medicalConditions, 1000),
      address: normalizeOptionalString(req.body?.address, 500),
    };

    // Handle file uploads
    const photoFile = Array.isArray(uploadedFiles.photo) ? uploadedFiles.photo[0] : null;
    const bloodTypeReportFile = Array.isArray(uploadedFiles.bloodTypeReport) ? uploadedFiles.bloodTypeReport[0] : null;
    const prescriptionReportFile = Array.isArray(uploadedFiles.prescriptionOrDischargeReport) ? uploadedFiles.prescriptionOrDischargeReport[0] : null;
    const surgicalReportFile = Array.isArray(uploadedFiles.surgicalInfoReport) ? uploadedFiles.surgicalInfoReport[0] : null;

    if (photoFile) {
      updates.photo = uploadedFileToDataUrl(photoFile);
    }
    if (bloodTypeReportFile) {
      updates.bloodTypeReport = uploadedFileToDataUrl(bloodTypeReportFile);
    }
    if (prescriptionReportFile) {
      updates.prescriptionOrDischargeReport = uploadedFileToDataUrl(prescriptionReportFile);
    }
    if (surgicalReportFile) {
      updates.surgicalInfoReport = uploadedFileToDataUrl(surgicalReportFile);
    }

    // Handle emergency contacts
    if (req.body?.emergencyContacts) {
      try {
        let contacts = [];
        if (typeof req.body.emergencyContacts === 'string') {
          contacts = JSON.parse(req.body.emergencyContacts);
        } else if (Array.isArray(req.body.emergencyContacts)) {
          contacts = req.body.emergencyContacts;
        }
        updates.emergencyContacts = sanitizeContacts(contacts);
      } catch {
        return res.status(400).json({ error: 'Invalid emergency contacts format' });
      }
    }

    // Update only provided fields (skip empty/null values)
    Object.keys(updates).forEach(key => {
      if (!updates[key] && updates[key] !== false) {
        delete updates[key];
      }
    });

    const updatedInfo = await EmergencyInfo.findByIdAndUpdate(
      req.user.sub,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('fullName email phoneNumber dateOfBirth bloodType allergies medications medicalConditions address emergencyContacts photo bloodTypeReport prescriptionOrDischargeReport surgicalInfoReport');

    res.json({
      message: 'Profile updated successfully',
      profile: updatedInfo,
    });
  } catch (error) {
    console.error('Error updating chatbot profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ── End CHATBOT endpoints ────────────────────────────────────────────

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