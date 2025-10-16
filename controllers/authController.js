import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Employee from '../models/Employee.js';

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};
export const register = async (req, res) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    let { name, email, password, role } = body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }

    email = String(email).toLowerCase().trim();
    const isSeunits = /^[A-Za-z0-9._%+-]+@seunits\.com$/.test(email);
    if (!isSeunits) return res.status(400).json({ message: 'Only @seunits.com emails are allowed' });
    if (String(password).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password, role });

    // Ensure there is an Employee profile for employees, and include employeeId in response
    let employeeDoc = null;
    if (user.role === 'employee') {
      employeeDoc = await Employee.findOne({ email: user.email });
      if (!employeeDoc) {
        employeeDoc = await Employee.create({ name: user.name, email: user.email, role: 'employee' });
      }
    }

    const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Optional: mark first login at registration
    await User.findByIdAndUpdate(user._id, { $set: { lastLoginAt: new Date() }, $inc: { loginCount: 1 } }, { new: true });

    return res.status(201).json({
      message: 'Registered successfully',
      user: { id: user._id, name: user.name, email: user.email, role: user.role, employeeId: employeeDoc?._id },
      token,
    });
  } catch (err) {
    const status = err?.name === 'ValidationError' ? 400 : 500;
    return res.status(status).json({ message: 'Registration failed', error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    let { email, password } = body;

    if (!email || !password) return res.status(400).json({ message: 'email and password are required' });

    email = String(email).toLowerCase().trim();
    const isSeunits = /^[A-Za-z0-9._%+-]+@seunits\.com$/.test(email);
    if (!isSeunits) return res.status(400).json({ message: 'Only @seunits.com emails are allowed' });

    let user = await User.findOne({ email });
    if (!user) {
      // Auto-bootstrap default admin on first login attempt with known email
      const defaultEmail = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@seunits.com').toLowerCase();
      if (email === defaultEmail) {
        user = await User.create({ name: process.env.DEFAULT_ADMIN_NAME || 'SEUnits Admin', email, password, role: 'admin' });
      } else {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    // Ensure there is an Employee profile and capture employeeId for response
    let employeeDoc = await Employee.findOne({ email: user.email });
    if (!employeeDoc) {
      employeeDoc = await Employee.create({ name: user.name, email: user.email, role: user.role || 'employee' });
    }

    // Persist login event on user doc
    await User.findByIdAndUpdate(user._id, { $set: { lastLoginAt: new Date() }, $inc: { loginCount: 1 } });

    const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      message: 'Login successful',
      user: { id: user._id, name: user.name, email: user.email, role: user.role, employeeId: employeeDoc?._id },
      token,
    });
  } catch (err) {
    const status = err?.name === 'ValidationError' ? 400 : 500;
    return res.status(status).json({ message: 'Login failed', error: err.message });
  }
};

export const logout = async (req, res) => {
  try {
    const authHeader = req.headers?.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.id) {
          await User.findByIdAndUpdate(decoded.id, { $set: { lastLogoutAt: new Date() } });
        }
      } catch (_e) {
        // ignore token errors on logout
      }
    }
    return res.json({ message: 'Logged out' });
  } catch (err) {
    return res.status(500).json({ message: 'Logout failed', error: err.message });
  }
};