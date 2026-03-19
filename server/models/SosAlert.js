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
  responderLocation: {
    lat: { type: Number },
    lng: { type: Number },
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
});

SosAlertSchema.index({ triggeredAt: -1 });
SosAlertSchema.index({ status: 1, triggeredAt: -1 });

export default mongoose.model('SosAlert', SosAlertSchema);
