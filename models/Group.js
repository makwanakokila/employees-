import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  },
  { timestamps: true }
);

export default mongoose.model('Group', groupSchema);


