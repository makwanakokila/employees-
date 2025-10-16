import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
);

export default mongoose.model('Employee', employeeSchema);


