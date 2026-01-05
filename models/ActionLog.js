import mongoose from 'mongoose';

const ActionLogSchema = new mongoose.Schema(
  {
    actorId: { type: String, required: true },
    actorEmail: { type: String, required: true },
    actorRole: { type: String, enum: ['admin', 'manager'], required: true },
    action: { type: String, required: true },
    details: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model('ActionLog', ActionLogSchema);
