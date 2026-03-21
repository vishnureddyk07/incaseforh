import mongoose from 'mongoose';

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    relationship: { type: String, default: '' },
  },
  { _id: false }
);

const SosAlertSchema = new mongoose.Schema({
  victimName: { type: String, default: '' },
  victimPhone: { type: String, default: '' },
  victimBloodType: { type: String, default: '' },
  victimAllergies: { type: String, default: '' },
  victimMedications: { type: String, default: '' },
  victimEmergencyContacts: { type: [emergencyContactSchema], default: [] },
  responderDeviceId: { type: String, default: '' },
  responderLocation: {
    lat: { type: Number },
    lng: { type: Number },
  },
  responderLocationAccuracy: { type: Number, default: null },
  responderLocationMeta: {
    altitude: { type: Number, default: null },
    heading: { type: Number, default: null },
    speed: { type: Number, default: null },
    capturedAt: { type: Date, default: null },
  },
  responderUserAgent: { type: String, default: '' },
  responderIP: { type: String, default: '' },
  triggeredAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'resolved'],
    default: 'active',
  },
  cancelledAt: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },
  closedByRole: { type: String, default: '' },
  closedByEmail: { type: String, default: '' },
});

SosAlertSchema.index({ triggeredAt: -1 });
SosAlertSchema.index({ status: 1, triggeredAt: -1 });

export default mongoose.model('SosAlert', SosAlertSchema);
