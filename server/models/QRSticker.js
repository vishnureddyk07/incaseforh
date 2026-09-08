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

const profileEntrySchema = new mongoose.Schema(
  {
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyInfo', required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    profileType: {
      type: String,
      enum: ['PRIMARY', 'SECONDARY'],
      default: 'SECONDARY',
      index: true,
    },
    profileName: { type: String, default: '' },
    profileEmail: { type: String, default: '' },
    profilePhone: { type: String, default: '' },
    canEdit: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
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
  multiProfileMode: { type: Boolean, default: false, index: true },
  profiles: [profileEntrySchema],
  profileCount: { type: Number, default: 0 },
  activeProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyInfo', default: null },
  createdByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
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
qrStickerSchema.index({ multiProfileMode: 1 });
qrStickerSchema.index({ createdByUser: 1 });
qrStickerSchema.index({ 'profiles.profileId': 1 });

export default mongoose.model('QRSticker', qrStickerSchema);
