import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';

export const markAttendance = async (req, res) => {
  try {
    const { employeeId, status, date } = req.body || {};

    // Resolve employee: accept either Employee _id, or User _id (map via email),
    // or infer from authenticated user if not provided.
    let employee = null;

    if (employeeId) {
      employee = await Employee.findById(employeeId);
      if (!employee) {
        // Treat provided id as potential User id
        const user = await User.findById(employeeId);
        if (user) {
          employee = await Employee.findOne({ email: user.email });
          if (!employee) {
            employee = await Employee.create({ name: user.name, email: user.email, role: user.role || 'employee' });
          }
        }
      }
    }

    if (!employee) {
      // Fallback to authenticated user context
      if (!req.user?.id) return res.status(404).json({ message: 'Employee not found' });
      const authUser = await User.findById(req.user.id);
      if (!authUser) return res.status(404).json({ message: 'Employee not found' });
      employee = await Employee.findOne({ email: authUser.email });
      if (!employee) {
        employee = await Employee.create({ name: authUser.name, email: authUser.email, role: authUser.role || 'employee' });
      }
    }

    const now = new Date();
    const day = date ? new Date(date) : now;
    const dayOnly = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const timeStr = now.toTimeString().split(' ')[0];
    const record = await Attendance.findOneAndUpdate(
      { employee: employee._id, date: dayOnly },
      { $setOnInsert: { checkInTime: timeStr }, $set: { status } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ message: 'Mark attendance failed', error: err.message });
  }
};

export const dailySummary = async (req, res) => {
  try {
    const queryDate = req.query.date ? new Date(req.query.date) : new Date();
    const dayOnly = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate());
    const nextDay = new Date(dayOnly);
    nextDay.setDate(dayOnly.getDate() + 1);
    const records = await Attendance.find({ date: { $gte: dayOnly, $lt: nextDay } }).populate('employee');
    const summary = records.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      { Present: 0, Late: 0, Absent: 0 }
    );
    res.json({ date: dayOnly, summary, records });
  } catch (err) {
    res.status(500).json({ message: 'Fetch summary failed', error: err.message });
  }
};

export const listEmployeeAttendance = async (req, res) => {
  try {
    const { employeeId } = req.query;
    if (!employeeId) return res.status(400).json({ message: 'employeeId is required' });
    const records = await Attendance.find({ employee: employeeId }).sort({ date: 1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Fetch attendance failed', error: err.message });
  }
};

