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
      enum: ['admin', 'manager'],
      required: true,
      default: 'manager',
    },
  },
  { timestamps: true }
);

// Unique index is already ensured by the field definition above

export default mongoose.model('User', UserSchema);
