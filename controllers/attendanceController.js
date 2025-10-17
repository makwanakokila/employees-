import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';

// Helpers to operate in Asia/Kolkata time consistently
const IST_TZ = 'Asia/Kolkata';
function istTimeString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TZ,
    hour12: false,
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).format(date);
  // en-GB gives HH:MM:SS
  return parts;
}
function istDateKey(date = new Date()) {
  const d = new Intl.DateTimeFormat('en-CA', { timeZone: IST_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  // en-CA yields YYYY-MM-DD
  return d;
}
function istMidnightDate(date = new Date()) {
  const key = istDateKey(date); // YYYY-MM-DD
  return new Date(`${key}T00:00:00+05:30`);
}
function toMinutes(hhmmss) {
  const [h, m, s] = hhmmss.split(':').map(Number);
  return h * 60 + m + Math.floor((s || 0) / 60); // seconds don't affect boundary minutes
}

export const markAttendance = async (req, res) => {
  try {
    const { employeeId, date } = req.body || {};

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
    const refDay = date ? new Date(date) : now;
    const dayOnly = istMidnightDate(refDay);

    // Time boundaries in IST minutes
    const nowStr = istTimeString(now);
    const nowMin = toMinutes(nowStr);
    const sevenAM = 7 * 60;
    const tenAM = 10 * 60;
    const elevenAM = 11 * 60;
    const ninePM = 21 * 60;

    // Enforce check-in allowed only between 07:00 and 21:00 IST
    if (nowMin < sevenAM) {
      return res.status(400).json({ message: 'Check-in allowed after 7:00 AM' });
    }
    if (nowMin > ninePM) {
      return res.status(400).json({ message: 'Check-in disabled after 9:00 PM' });
    }

    // Determine status server-side
    let status = 'Present';
    if (nowMin > elevenAM) {
      status = 'Late';
    } else if (nowMin <= tenAM) {
      status = 'Present';
    } else {
      // Between 10:00 and 11:00 -> still Present per requirement
      status = 'Present';
    }

    const timeStr = nowStr; // store IST time string
    let record = await Attendance.findOne({ employee: employee._id, date: dayOnly });
    if (!record) {
      record = await Attendance.create({ employee: employee._id, date: dayOnly, checkInTime: timeStr, status });
    } else {
      // Update status always
      record.status = status;
      // Fix earlier incorrect time if it is before 07:00 but now is >= 07:00
      const existingMin = record.checkInTime ? toMinutes(record.checkInTime.length === 8 ? record.checkInTime : `${record.checkInTime}:00`) : null;
      if (!record.checkInTime || (existingMin !== null && existingMin < sevenAM && nowMin >= sevenAM)) {
        record.checkInTime = timeStr;
      }
      await record.save();
    }
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ message: 'Mark attendance failed', error: err.message });
  }
};

export const dailySummary = async (req, res) => {
  try {
    const queryDate = req.query.date ? new Date(req.query.date) : new Date();
    const dayOnly = istMidnightDate(queryDate);
    const nextDay = istMidnightDate(new Date(dayOnly.getTime() + 24 * 60 * 60 * 1000));
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

    // Backfill any missing/empty status based on stored checkInTime
    const tenAM = 10 * 60;
    const elevenAM = 11 * 60;

    for (const rec of records) {
      if (!rec.status || (typeof rec.status === 'string' && rec.status.trim() === '')) {
        let computed = 'Absent';
        if (rec.checkInTime) {
          const inMin = toMinutes(rec.checkInTime.length === 8 ? rec.checkInTime : `${rec.checkInTime}:00`);
          if (inMin > elevenAM) computed = 'Late';
          else computed = 'Present'; // up to 11:00 is Present per rules
        }
        rec.status = computed;
        try { await rec.save(); } catch (_) {}
      }
    }

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Fetch attendance failed', error: err.message });
  }
};

export const checkoutAttendance = async (req, res) => {
  try {
    const { employeeId, date } = req.body || {};

    // Resolve employee similar to markAttendance
    let employee = null;
    if (employeeId) {
      employee = await Employee.findById(employeeId);
      if (!employee) {
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
      if (!req.user?.id) return res.status(404).json({ message: 'Employee not found' });
      const authUser = await User.findById(req.user.id);
      if (!authUser) return res.status(404).json({ message: 'Employee not found' });
      employee = await Employee.findOne({ email: authUser.email });
      if (!employee) {
        employee = await Employee.create({ name: authUser.name, email: authUser.email, role: authUser.role || 'employee' });
      }
    }

    const now = new Date();
    const refDay = date ? new Date(date) : now;
    const dayOnly = istMidnightDate(refDay);
    const nowStr = istTimeString(now);
    const nowMin = toMinutes(nowStr);
    const sevenPM = 19 * 60;
    const eightPM = 20 * 60;
    const ninePM = 21 * 60;

    if (nowMin < sevenPM) {
      return res.status(400).json({ message: 'Checkout allowed after 7:00 PM' });
    }
    if (nowMin > ninePM) {
      return res.status(400).json({ message: 'Checkout disabled after 9:00 PM' });
    }

    const record = await Attendance.findOne({ employee: employee._id, date: dayOnly });
    if (!record || !record.checkInTime) {
      return res.status(400).json({ message: 'No check-in found for today' });
    }
    if (record.checkOutTime) {
      return res.status(400).json({ message: 'Already checked out' });
    }

    // Compute overtime minutes between 19:00 and 20:00 only
    const cutoffMin = Math.min(nowMin, eightPM);
    const overtimeMinutes = Math.max(0, cutoffMin - sevenPM);

    record.checkOutTime = nowStr; // IST time string
    record.overtimeMinutes = overtimeMinutes;
    await record.save();

    res.json(record);
  } catch (err) {
    res.status(400).json({ message: 'Checkout failed', error: err.message });
  }
};


