import WorkUpload from '../models/WorkUpload.js';

export const saveUpload = async (req, res) => {
  try {
    const { title, description, groupId, uploadedBy } = req.body;

    // Validate files
    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate required fields
    if (!title || !description || !groupId || !uploadedBy) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const payload = {
      title,
      description,
      files: files.map(f => f.filename),
      group: groupId,
      uploadedBy,
    };

    const record = await WorkUpload.create(payload);
    const populated = await record.populate(['uploadedBy', 'group']);
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: 'Upload save failed', error: err.message });
  }
};

export const listUploads = async (_req, res) => {
  try {
    const uploads = await WorkUpload.find()
      .populate('uploadedBy')
      .populate('group')
      .sort({ createdAt: -1 });
    res.json(uploads);
  } catch (err) {
    res.status(500).json({ message: 'Fetch uploads failed', error: err.message });
  }
};


