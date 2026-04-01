import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'user', 'police', 'ambulance'],
      required: true,
      default: 'manager',
    },
  },
  { timestamps: true }
);

// Unique index is already ensured by the field definition above
UserSchema.index({ role: 1, createdAt: -1 });

export default mongoose.model('User', UserSchema);
