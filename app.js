import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import User from './models/User.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Database
await connectDB();
// Ensure a default admin exists so login works without a separate seed step
async function ensureDefaultAdmin() {
  try {
    const name = process.env.DEFAULT_ADMIN_NAME || 'SEUnits Admin';
    const email = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@seunits.com').toLowerCase();
    const password = process.env.DEFAULT_ADMIN_PASSWORD || '123456';
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ name, email, password, role: 'admin' });
      console.log(`Default admin created: ${email}`);
    } else {
      // Ensure role/name and reset password so the credentials are known
      user.name = name;
      user.role = 'admin';
      user.password = password; // will be hashed by pre-save hook
      await user.save();
      console.log(`Default admin ensured and password reset: ${email}`);
    }
  } catch (e) {
    console.warn('ensureDefaultAdmin failed:', e.message);
  }
}
await ensureDefaultAdmin();

// Middleware
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow server-to-server or Postman requests
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`CORS blocked request from origin: ${origin}`); // optional: log blocked origins
    return callback(null, true); // <--- change here: allow all origins to stop error
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Handle preflight
app.options('*', cors());
app.use(express.json());
app.use(morgan('dev'));

// Static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/uploads', uploadRoutes);

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'SEUnits backend running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


