import Group from '../models/Group.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';

export const createGroup = async (req, res) => {
  try {
    const group = await Group.create({ name: req.body.name });
    res.status(201).json(group);
  } catch (err) {
    res.status(400).json({ message: 'Create group failed', error: err.message });
  }
};

export const getGroups = async (_req, res) => {
  try {
    const groups = await Group.find().populate('members');
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: 'Fetch groups failed', error: err.message });
  }
};

export const getMyGroups = async (req, res) => {
  try {
    // Resolve current employee id from authenticated user
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const employee = await Employee.findOne({ email: user.email });
    if (!employee) return res.json([]);
    const groups = await Group.find({ members: employee._id }).populate('members');
    return res.json(groups);
  } catch (err) {
    res.status(500).json({ message: 'Fetch my groups failed', error: err.message });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const group = await Group.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true });
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json(group);
  } catch (err) {
    res.status(400).json({ message: 'Update group failed', error: err.message });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findByIdAndDelete(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    // Optionally remove group from employees
    await Employee.updateMany({ group: group._id }, { $set: { group: null } });
    res.json({ message: 'Group deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Delete group failed', error: err.message });
  }
};

export const assignMembers = async (req, res) => {
  try {
    const { memberIds } = req.body; // array of employee ids
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    group.members = memberIds;
    await group.save();
    await Employee.updateMany({ _id: { $in: memberIds } }, { $set: { group: group._id } });
    res.json(await group.populate('members'));
  } catch (err) {
    res.status(400).json({ message: 'Assign members failed', error: err.message });
  }
};


