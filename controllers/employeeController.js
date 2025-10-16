import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Group from '../models/Group.js';

export const createEmployee = async (req, res) => {
  try {
    const { name, email, role = 'employee', status = 'Active', password, groups = [] } = req.body || {};
    if (!name || !email) return res.status(400).json({ message: 'name and email are required' });

    // Create the Employee document
    const employee = await Employee.create({ name, email, role, status });

    // Ensure a corresponding User exists for authentication (with password)
    let user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) {
      if (password) {
        user = await User.create({ name, email, password, role });
      }
    } else {
      // Keep names/roles in sync; only set password if provided
      user.name = name;
      user.role = role;
      if (password) user.password = password; // Will be hashed by pre-save hook
      await user.save();
    }

    const groupIds = Array.isArray(groups) ? groups.map(id => String(id)) : [];
    if (groupIds.length > 0) {
      const groupDocs = await Group.find({ _id: { $in: groupIds } });
      const foundIds = groupDocs.map(g => g._id);
      await Group.updateMany({ _id: { $in: foundIds } }, { $addToSet: { members: employee._id } });
      employee.group = foundIds[0] || null;
      await employee.save();
    }

    const memberGroups = await Group.find({ members: employee._id }).select('_id');
    const groupsArray = memberGroups.map(g => String(g._id));
    const payload = { ...(employee.toObject ? employee.toObject() : employee), groups: groupsArray };
    res.status(201).json(payload);
  } catch (err) {
    res.status(400).json({ message: 'Create employee failed', error: err.message });
  }
};

export const getEmployees = async (_req, res) => {
  try {
    const employees = await Employee.find().populate('group');
    const ids = employees.map(e => e._id);
    const groups = await Group.find({ members: { $in: ids } }).select('_id members');
    const groupsByMember = new Map();
    groups.forEach(g => {
      (g.members || []).forEach(m => {
        const key = String(m);
        const arr = groupsByMember.get(key) || [];
        arr.push(String(g._id));
        groupsByMember.set(key, arr);
      });
    });
    const payload = employees.map(e => ({ ...(e.toObject ? e.toObject() : e), groups: groupsByMember.get(String(e._id)) || [] }));
    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: 'Fetch employees failed', error: err.message });
  }
};

export const getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('group');
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    const memberGroups = await Group.find({ members: employee._id }).select('_id');
    const groupsArray = memberGroups.map(g => String(g._id));
    const payload = { ...(employee.toObject ? employee.toObject() : employee), groups: groupsArray };
    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: 'Fetch employee failed', error: err.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { groups = undefined, ...updates } = req.body || {};
    const employee = await Employee.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Sync changes to User account if present
    const { name, email, role, password } = updates || {};
    const targetEmail = email || employee.email;
    let user = await User.findOne({ email: String(targetEmail).toLowerCase() });
    if (user) {
      if (name) user.name = name;
      if (role) user.role = role;
      if (password) user.password = password; // Will be hashed
      await user.save();
    }

    if (Array.isArray(groups)) {
      const groupIds = groups.map(id => String(id));
      // Remove employee from groups where not desired
      await Group.updateMany({ members: employee._id, _id: { $nin: groupIds } }, { $pull: { members: employee._id } });
      // Add employee to desired groups
      await Group.updateMany({ _id: { $in: groupIds } }, { $addToSet: { members: employee._id } });
      employee.group = groupIds[0] || null;
      await employee.save();
    }

    const memberGroups = await Group.find({ members: employee._id }).select('_id');
    const groupsArray = memberGroups.map(g => String(g._id));
    const payload = { ...(employee.toObject ? employee.toObject() : employee), groups: groupsArray };
    res.json(payload);
  } catch (err) {
    res.status(400).json({ message: 'Update employee failed', error: err.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Also remove corresponding User account, if any
    await User.deleteOne({ email: String(employee.email).toLowerCase() });
    // Remove from all groups
    await Group.updateMany({ members: employee._id }, { $pull: { members: employee._id } });

    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Delete employee failed', error: err.message });
  }
};


