import mongoose from 'mongoose';

const HospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
      index: true,
    },
    state: {
      type: String,
      required: true,
    },
    pincode: {
      type: String,
      required: true,
    },
    // Geospatial indexing for nearby search
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        index: '2dsphere',
      },
    },
    phone: {
      type: String,
      required: true,
    },
    ambulancePhone: {
      type: String,
      required: true,
    },
    emergencyPhone: {
      type: String,
      default: '108',
    },
    hasAmbulance: {
      type: Boolean,
      default: true,
    },
    type: {
      type: String,
      enum: ['government', 'private', 'trauma-center', 'nursing-home'],
      default: 'private',
      index: true,
    },
    hasICU: {
      type: Boolean,
      default: false,
    },
    hasOperatingTheatre: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    website: {
      type: String,
      default: null,
    },
    operatingHours: {
      type: String,
      default: '24/7',
    },
    acceptsEmergency: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Create geospatial index for location-based queries
HospitalSchema.index({ location: '2dsphere' });
HospitalSchema.index({ city: 1, type: 1 });

export default mongoose.model('Hospital', HospitalSchema);
