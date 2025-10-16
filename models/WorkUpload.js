import mongoose from 'mongoose';

const workUploadSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    files: [{ type: String, required: true }],
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('WorkUpload', workUploadSchema);


