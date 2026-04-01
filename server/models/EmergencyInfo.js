import mongoose from 'mongoose';

const emergencyInfoSchema = new mongoose.Schema({
  fullName: { type: String },
  email: { type: String, index: true }, // Email no longer required
  bloodType: { type: String },
  emergencyContacts: [{
    name: { type: String },
    phone: { type: String }
  }],
  allergies: { type: String },
  medications: { type: String },
  medicalConditions: { type: String },
  photo: { type: String },
  dateOfBirth: { type: String },
  address: { type: String },
  phoneNumber: { type: String, index: true },
  alternateNumber1: { type: String, required: false },
  alternateNumber2: { type: String, required: false },
  qrCode: { type: String }, // Store the QR code URL
}, { timestamps: true });

// Speeds up common API patterns: latest-first admin list and email/phone lookups.
emergencyInfoSchema.index({ createdAt: -1 });
emergencyInfoSchema.index({ email: 1, createdAt: -1 });
emergencyInfoSchema.index({ phoneNumber: 1, createdAt: -1 });

const EmergencyInfo = mongoose.model('EmergencyInfo', emergencyInfoSchema);

export default EmergencyInfo;