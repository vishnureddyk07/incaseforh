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

const secondaryProfileSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyInfo',
      required: true,
    },
    label: {
      type: String,
      default: 'Secondary User',
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const profileEntrySchema = new mongoose.Schema(
  {
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyInfo', required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
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
  profiles: {
    type: [profileEntrySchema],
    validate: [
      (val) => val.length <= 3,
      'Maximum 3 profiles allowed per QR code',
    ],
    default: [],
  },
  profileCount: { type: Number, default: 0 },
  createdByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  primaryProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmergencyInfo',
    default: null,
    index: true,
  },

  secondaryProfiles: {
    type: [secondaryProfileSchema],
    validate: [
      (val) => val.length <= 2,
      'Maximum 2 secondary profiles allowed per QR code (3 profiles total including owner)',
    ],
    default: [],
  },

  activeProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmergencyInfo',
    default: null,
    index: true,
  },

  activatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmergencyInfo',
    default: null,
  },
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
qrStickerSchema.index({ primaryProfileId: 1 });
qrStickerSchema.index({ activeProfileId: 1 });
qrStickerSchema.index({ 'profiles.profileId': 1 });

export default mongoose.models.QRSticker || mongoose.model('QRSticker', qrStickerSchema);