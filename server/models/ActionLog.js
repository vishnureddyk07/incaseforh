import mongoose from 'mongoose';

const ActionLogSchema = new mongoose.Schema(
  {
    actorId: { type: String, required: true },
    actorEmail: { type: String, required: true },
    actorRole: { type: String, enum: ['admin', 'manager', 'public'], required: true },
    action: { type: String, required: true },
    details: { type: Object, default: {} },
  },
  { timestamps: true }
);

// Keep admin log queries fast as data grows.
ActionLogSchema.index({ createdAt: -1 });
ActionLogSchema.index({ actorId: 1, createdAt: -1 });

export default mongoose.model('ActionLog', ActionLogSchema);
