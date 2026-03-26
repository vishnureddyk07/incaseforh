import mongoose from 'mongoose';

const qrBatchSchema = new mongoose.Schema({
  batchId: { type: String, required: true, unique: true, index: true },
  quantity: { type: Number, required: true },
  type: {
    type: String,
    enum: ['b2c', 'b2b', 'b2g'],
    default: 'b2c',
    index: true,
  },
  createdBy: { type: String, required: true },
  organizationName: { type: String, default: '' },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true },
  downloadCount: { type: Number, default: 0 },
});

qrBatchSchema.index({ batchId: 1 }, { unique: true });
qrBatchSchema.index({ createdAt: -1 });

export default mongoose.model('QRBatch', qrBatchSchema);
