const mongoose = require('mongoose');
const { Schema } = mongoose;
const { UserRole, VerificationStatus } = require('./enum');



const EmergencyContactSchema = new Schema(
  {
    name: { type: String, trim: true, maxlength: 120 },
    phone: {
      type: String,
      trim: true,
      match: [/^\+977-9[78]\d{8}$/, 'Please provide a valid Nepali mobile number'],
    },
    relationship: { type: String, trim: true, maxlength: 50 },
  },
  { _id: false }
);

const BaseLocationSchema = new Schema(
  {
    city: { type: String, trim: true, maxlength: 50 },
    district: { type: String, trim: true, maxlength: 50 },
  },
  { _id: false }
);

const NotificationPreferencesSchema = new Schema(
  {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: false },
    newMessages: { type: Boolean, default: true },
    leaseExpiry: { type: Boolean, default: true },
    paymentReminders: { type: Boolean, default: true },
  },
  { _id: false }
);

const UserProfileSchema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'], // Google OAuth usually provides this
      trim: true,
      maxlength: 120,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say',
    },
    avatarUrl: { type: String, trim: true, default: null },
    
    // --- KYC Fields (Optional at signup, required later for specific actions) ---
    citizenshipNo: { type: String, trim: true, index: true },
    citizenshipDistrict: { type: String, trim: true },
    nationalIdNin: { type: String, trim: true, index: true },
    agencyPanVat: { type: String, trim: true },
    brokerLicenseNo: { type: String, trim: true },
    
    whatsappNumber: {
      type: String,
      trim: true,
      match: [/^\+977-9[78]\d{8}$/, 'Please provide a valid Nepali WhatsApp number'],
    },
    preferredLanguage: { type: String, enum: ['ne', 'en'], default: 'ne' },
    bio: { type: String, maxlength: 500 },
    
    emergencyContact: { type: EmergencyContactSchema, default: {} },
    baseLocation: { type: BaseLocationSchema, default: {} },
  },
  { _id: false }
);

// ============================================================================
// MAIN USER SCHEMA
// ============================================================================

const UserSchema = new Schema(
  {
    // --- Authentication & Identity ---
    authProvider: {
      type: String,
      enum: ['local', 'google', 'facebook', 'apple'],
      default: 'local',
    },
    googleId: { type: String, sparse: true, select: false }, // For OAuth
    
    // Conditional Requirement: User must have EITHER an email OR a Nepal phone number
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      // required: function() { return !this.nepalPhone; } // Uncomment if you want strict DB-level enforcement
    },
    nepalPhone: {
      type: String,
      trim: true,
      sparse: true, // Allows nulls without breaking unique constraint
      unique: true,
      match: [/^\+977-9[78]\d{8}$/, 'Please provide a valid Nepali mobile number'],
      // required: function() { return !this.email; } // Uncomment if you want strict DB-level enforcement
    },
    passwordHash: {
      type: String,
      select: false,
    },

    // --- Roles & Status ---
    roles: {
      type: [String],
      enum: Object.values(UserRole),
      default: [UserRole.TENANT_BUYER],
    },
    primaryRole: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.TENANT_BUYER,
      index: true,
    },
    
    // --- Verification ---
    isPhoneVerified: { type: Boolean, default: false, index: true },
    isEmailVerified: { type: Boolean, default: false },
    kycStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.UNVERIFIED,
      index: true,
    },

    // --- Profile & Preferences ---
    profile: {
      type: UserProfileSchema,
      required: true, // The object exists, but inner fields (except fullName) are optional
    },
    favorites: [{ type: Schema.Types.ObjectId, ref: 'Property' }],
    notificationPreferences: { type: NotificationPreferencesSchema, default: {} },

    // --- PROGRESSIVE PROFILING: Onboarding Tracking ---
    isProfileComplete: {
      type: Boolean,
      default: false,
      index: true, // Easy to query: User.find({ isProfileComplete: false })
    },
    profileCompletionScore: {
      type: Number,
      default: 0, // 0 to 100. Great for UI progress bars!
    },

    // --- Security & Lifecycle ---
    isActive: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    lastActiveAt: { type: Date, default: null },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    otpToken: { type: String, select: false },
    otpExpires: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================================================
// VIRTUAL RELATIONSHIPS
// ============================================================================
UserSchema.virtual('ownedProperties', { ref: 'Property', localField: '_id', foreignField: 'owner' });
UserSchema.virtual('appointmentsAsSeeker', { ref: 'VisitAppointment', localField: '_id', foreignField: 'seeker' });
UserSchema.virtual('appointmentsAsOwner', { ref: 'VisitAppointment', localField: '_id', foreignField: 'owner' });
UserSchema.virtual('leasesAsLandlord', { ref: 'RentalLease', localField: '_id', foreignField: 'landlord' });
UserSchema.virtual('leasesAsTenant', { ref: 'RentalLease', localField: '_id', foreignField: 'tenant' });

// ============================================================================
// INSTANCE METHODS (For Progressive Profiling Logic)
// ============================================================================

/**
 * Calculates profile completion percentage based on filled fields.
 * Call this after a user updates their profile.
 */
UserSchema.methods.calculateProfileCompletion = function () {
  let score = 0;
  const p = this.profile;

  // Base points for basic info
  if (this.email) score += 10;
  if (this.nepalPhone) score += 10;
  if (p.fullName) score += 10;
  if (p.avatarUrl) score += 10;

  // KYC / Trust points
  if (p.citizenshipNo) score += 15;
  if (p.nationalIdNin) score += 15;
  if (p.baseLocation && p.baseLocation.district) score += 10;
  if (p.emergencyContact && p.emergencyContact.phone) score += 10;
  if (p.bio) score += 5;
  if (this.isPhoneVerified || this.isEmailVerified) score += 15;

  // Cap at 100
  this.profileCompletionScore = Math.min(score, 100);
  
  // Consider profile "complete" for basic platform use at 40%, 
  // but "KYC complete" at 80%+
  this.isProfileComplete = this.profileCompletionScore >= 40; 
  
  return this.profileCompletionScore;
};

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Auto-calculate completion score before saving
UserSchema.pre('save', function (next) {
  // Only calculate if profile data was modified or it's a new document
  if (this.isModified('profile') || this.isModified('email') || this.isModified('nepalPhone') || this.isNew) {
    this.calculateProfileCompletion();
  }
  next();
});

// Soft delete middleware
UserSchema.pre(/^find/, function (next) {
  if (!this.getQuery()._id) {
    this.where({ isActive: true });
  }
  next();
});

const User = mongoose.model('User', UserSchema);
module.exports = User;