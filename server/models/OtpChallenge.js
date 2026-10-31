import mongoose from 'mongoose';

const otpChallengeSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true, index: true },
    purpose: { type: String, enum: ['edit', 'switch', 'secondary'], required: true },
    phoneNumber: { type: String, required: true, index: true },
    profileId: { type: String, required: true },
    qrUuid: { type: String, default: null },
    ownerProfileId: { type: String, default: null },
    providerRequestId: { type: String, default: null },
    pendingProfileData: { type: mongoose.Schema.Types.Mixed, default: undefined },
    status: {
      type: String,
      enum: ['pending', 'verifying', 'verified', 'consumed', 'failed'],
      default: 'pending',
      index: true,
    },
    attempts: { type: Number, default: 0 },
    resendCount: { type: Number, default: 0 },
    lastSentAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    purgeAt: { type: Date, required: true },
  },
  { timestamps: true }
);

otpChallengeSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
otpChallengeSchema.index({ phoneNumber: 1, createdAt: -1 });

export default mongoose.models.OtpChallenge || mongoose.model('OtpChallenge', otpChallengeSchema);
