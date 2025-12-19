import mongoose from 'mongoose';

const emergencyInfoSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, index: true },
  bloodType: { type: String },
  emergencyContact: { type: String },
  allergies: { type: String },
  medications: { type: String },
  medicalConditions: { type: String },
  photo: { type: String },
  dateOfBirth: { type: String },
  address: { type: String },
  phoneNumber: { type: String },
  qrCode: { type: String }, // Store the QR code URL
}, { timestamps: true });

const EmergencyInfo = mongoose.model('EmergencyInfo', emergencyInfoSchema);

export default EmergencyInfo;