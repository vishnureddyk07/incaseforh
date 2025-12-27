import mongoose from 'mongoose';

const emergencyInfoSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, index: true }, // Email no longer required
  bloodType: { type: String },
  emergencyContact: { type: String },
  allergies: { type: String },
  medications: { type: String },
  medicalConditions: { type: String },
  photo: { type: String },
  dateOfBirth: { type: String, required: true }, // Now required
  address: { type: String },
  phoneNumber: { type: String, required: true, index: true }, // Now required and indexed for search
  alternateNumber1: { type: String, required: true }, // New required field
  alternateNumber2: { type: String, required: true }, // New required field
  qrCode: { type: String }, // Store the QR code URL
}, { timestamps: true });

const EmergencyInfo = mongoose.model('EmergencyInfo', emergencyInfoSchema);

export default EmergencyInfo;