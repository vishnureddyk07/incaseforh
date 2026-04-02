import mongoose from 'mongoose';

const assignedToSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    organizationName: { type: String, default: '' },
  },
  { _id: false }
);

const qrStickerSchema = new mongoose.Schema({
  uuid: { type: String, required: true, unique: true, index: true },
  serialNumber: { type: String, required: true, unique: true, index: true },
  status: {
    type: String,
    enum: ['generated', 'distributed', 'unactivated', 'active', 'deactivated'],
    default: 'generated',
    index: true,
  },
  type: {
    type: String,
    enum: ['b2c', 'b2b', 'b2g'],
    default: 'b2c',
    index: true,
  },
  batchId: { type: String, required: true, index: true },
  assignedTo: { type: assignedToSchema, default: undefined },
  activatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyInfo', default: null },
  activatedAt: { type: Date, default: null, index: true },
  deactivatedAt: { type: Date, default: null },
  deactivatedReason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  lastScannedAt: { type: Date, default: null },
  scanCount: { type: Number, default: 0 },
});

qrStickerSchema.index({ uuid: 1 }, { unique: true });
qrStickerSchema.index({ serialNumber: 1 }, { unique: true });
qrStickerSchema.index({ status: 1 });
qrStickerSchema.index({ batchId: 1 });
qrStickerSchema.index({ activatedAt: -1 });
qrStickerSchema.index({ activatedBy: 1, activatedAt: -1 });
qrStickerSchema.index({ createdAt: -1 });

export default mongoose.model('QRSticker', qrStickerSchema);
