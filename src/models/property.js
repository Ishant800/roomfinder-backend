const mongoose = require('mongoose');
const { Schema } = mongoose;
const {
  TransactionIntent,
  PropertyCategory,
  LandSystemStandard,
  RoadSurfaceType,
  VastuFacing,
  VerificationStatus,
} = require('./enum'); // Adjust path as needed

// ============================================================================
// SUB-SCHEMAS
// ============================================================================

const NepalLocationSchema = new Schema(
  {
    provinceId: { type: Number, required: [true, 'Province ID (1-7) is required'], min: 1, max: 7 },
    provinceName: { type: String, required: true, trim: true },
    districtName: { type: String, required: true, trim: true },
    municipalityName: { type: String, required: true, trim: true },
    wardNumber: { type: Number, required: true, min: 1, max: 35 },
    toleLocality: { type: String, required: true, trim: true },
    streetAddress: { type: String, trim: true },
    isExactLocationHidden: { type: Boolean, default: false },
    geometry: {
      type: { type: String, enum: ['Point'], default: 'Point', required: true },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
  },
  { _id: false }
);

const LandMeasurementSchema = new Schema(
  {
    systemStandard: {
      type: String,
      enum: Object.values(LandSystemStandard),
      required: true,
      default: LandSystemStandard.VALLEY_ROPANI,
    },
    ropani: { type: Number, default: 0, min: 0 },
    aana: { type: Number, default: 0, min: 0, max: 15 },
    paisa: { type: Number, default: 0, min: 0, max: 3 },
    daam: { type: Number, default: 0, min: 0, max: 3.99 },
    bigha: { type: Number, default: 0, min: 0 },
    kattha: { type: Number, default: 0, min: 0, max: 19 },
    dhur: { type: Number, default: 0, min: 0, max: 19.99 },
    standardizedAreaSqft: { type: Number, required: true, index: true },
    standardizedAreaSqm: { type: Number, required: true },
  },
  { _id: false }
);

const PropertyVerificationSchema = new Schema(
  {
    kittaNumber: { type: String, required: [true, 'Kitta (Parcel) number is required'], trim: true, index: true },
    sheetNumber: { type: String, trim: true },
    malpotOfficeName: { type: String, required: [true, 'Malpot Karyalaya name is required'], trim: true },
    lalpurjaOwnerName: { type: String, required: true, trim: true },
    lalpurjaDocumentUrl: { type: String, required: true, trim: true },
    cadastralNaksaTraceUrl: { type: String, trim: true },
    buildingCompletionCertificateUrl: { type: String, trim: true },
    taxClearanceReceiptUrl: { type: String, trim: true },
    isRokkaCleared: { type: Boolean, default: false },
    auditStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.PENDING_REVIEW,
      index: true,
    },
    auditedByAdmin: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    auditNotes: { type: String, trim: true },
    verifiedAt: { type: Date, default: null },
  },
  { _id: false }
);

// ============================================================================
// ROOT PROPERTY SCHEMA
// ============================================================================

const PropertySchema = new Schema(
  {
    // --- Ownership & Management ---
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Property owner reference is required'],
      index: true,
    },
    listedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      // If null, it defaults to the owner. If set, it's an agent/broker.
    },

    // --- Basic Info ---
    title: { type: String, required: [true, 'Property title is required'], trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: [true, 'Property description is required'] },
    
    intent: { type: String, enum: Object.values(TransactionIntent), required: true, index: true },
    category: { type: String, enum: Object.values(PropertyCategory), required: true, index: true },

    // --- Financials ---
    priceNpr: { type: Number, required: [true, 'Price in NPR is required'], min: 0, index: true },
    pricePerSqft: { type: Number }, // Auto-calculated for easy sorting/comparison
    isPriceNegotiable: { type: Boolean, default: false },
    rentalFrequency: { type: String, enum: ['MONTHLY', 'QUARTERLY', 'YEARLY'], default: 'MONTHLY' },
    advanceDepositNpr: { type: Number, default: 0 },

    // --- Location & Measurement ---
    location: { type: NepalLocationSchema, required: true },
    landMeasurement: { type: LandMeasurementSchema, required: true },
    verification: { type: PropertyVerificationSchema, required: true },

    // --- Structural Specifications ---
    totalStoreys: { type: Number, min: 0 },
    builtUpAreaSqft: { type: Number, min: 0 },
    bedrooms: { type: Number, default: 0, min: 0 },
    bathrooms: { type: Number, default: 0, min: 0 },
    livingRooms: { type: Number, default: 0, min: 0 },
    kitchens: { type: Number, default: 0, min: 0 },
    furnishingStatus: { type: String, enum: ['UNFURNISHED', 'SEMI_FURNISHED', 'FULLY_FURNISHED'], default: 'UNFURNISHED' },
    facingDirection: { type: String, enum: Object.values(VastuFacing) },
    builtYearBs: { type: Number },

    // --- Access & Utilities ---
    roadWidthFeet: { type: Number, required: [true, 'Road access width in feet is required'], min: 0 },
    roadSurface: { type: String, enum: Object.values(RoadSurfaceType), default: RoadSurfaceType.BLACKTOPPED_PITCHED },
    hasMelamchiWater: { type: Boolean, default: false },
    hasDeepBoring: { type: Boolean, default: false },
    waterStorageCapacityLitres: { type: Number, default: 0 },
    hasSolarBackup: { type: Boolean, default: false },
    hasThreePhaseElectricity: { type: Boolean, default: false },
    hasDrainageSystem: { type: Boolean, default: true },
    parkingCarCount: { type: Number, default: 0 },
    parkingBikeCount: { type: Number, default: 0 },

    // --- Media ---
    mediaPhotos: {
      type: [String],
      required: [true, 'At least one property photo is required'],
      validate: [(photos) => photos.length > 0, 'Please upload at least one property photo'],
    },
    mediaVideoUrl: { type: String, trim: true },
    virtualTour360Url: { type: String, trim: true },

    // --- Lifecycle & Analytics ---
    listingStatus: {
      type: String,
      enum: ['DRAFT', 'UNDER_AUDIT', 'PUBLISHED', 'BOOKED', 'RENTED', 'SOLD'],
      default: 'DRAFT',
      index: true,
    },
    isFeatured: { type: Boolean, default: false, index: true },
    qualityScore: { type: Number, default: 0, min: 0, max: 100 },
    viewCount: { type: Number, default: 0 },
    inquiryCount: { type: Number, default: 0 },

    // --- Advanced: Soft Deletes ---
    isActive: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================================================
// HIGH-PERFORMANCE INDEXES
// ============================================================================

// 1. Geospatial 2dsphere index for radius discovery and Map viewport bounding box queries
PropertySchema.index({ 'location.geometry': '2dsphere' });

// 2. High-speed compound index for faceted marketplace filter queries
PropertySchema.index({
  'location.provinceId': 1,
  'location.districtName': 1,
  intent: 1,
  category: 1,
  listingStatus: 1,
  priceNpr: 1,
});

// 3. Full-text search index on title, description, and locality
PropertySchema.index({
  title: 'text',
  description: 'text',
  'location.toleLocality': 'text',
  'location.municipalityName': 'text',
});

// ============================================================================
// VIRTUAL POPULATIONS
// ============================================================================

PropertySchema.virtual('appointments', {
  ref: 'VisitAppointment',
  localField: '_id',
  foreignField: 'property',
});

PropertySchema.virtual('leases', {
  ref: 'RentalLease',
  localField: '_id',
  foreignField: 'property',
});

// ============================================================================
// INSTANCE METHODS & MIDDLEWARE
// ============================================================================

/**
 * Calculates listing quality score based on completeness and verification.
 */
PropertySchema.methods.calculateQualityScore = function () {
  let score = 0;
  
  // Basic Info (20 pts)
  if (this.title && this.description.length > 100) score += 20;
  
  // Media (30 pts)
  if (this.mediaPhotos && this.mediaPhotos.length >= 3) score += 15;
  if (this.mediaPhotos && this.mediaPhotos.length >= 8) score += 10; // Bonus for many photos
  if (this.mediaVideoUrl) score += 5;
  
  // Verification & Trust (40 pts)
  if (this.verification && this.verification.kittaNumber) score += 10;
  if (this.verification && this.verification.lalpurjaDocumentUrl) score += 15;
  if (this.verification && this.verification.isRokkaCleared) score += 15;
  
  // Location Precision (10 pts)
  if (this.location && this.location.geometry && this.location.geometry.coordinates) score += 10;

  this.qualityScore = Math.min(score, 100);
  
  // Auto-calculate price per sqft if data exists
  if (this.priceNpr > 0 && this.landMeasurement.standardizedAreaSqft > 0) {
    this.pricePerSqft = Math.round(this.priceNpr / this.landMeasurement.standardizedAreaSqft);
  }

  return this.qualityScore;
};

// Pre-save middleware: Auto-generate slug and calculate quality score
PropertySchema.pre('save', async function (next) {
  // 1. Auto-generate slug if it's a new document or title changed
  if (this.isNew || this.isModified('title')) {
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/(^-|-$)+/g, '');    // Trim leading/trailing hyphens
    
    // Append a short unique ID to guarantee uniqueness without complex DB checks
    this.slug = `${baseSlug}-${this._id.toString().slice(-6)}`;
  }

  // 2. Calculate quality score if relevant fields were modified
  if (this.isNew || this.isModified('title') || this.isModified('description') || 
      this.isModified('mediaPhotos') || this.isModified('mediaVideoUrl') || 
      this.isModified('verification') || this.isModified('location') ||
      this.isModified('priceNpr') || this.isModified('landMeasurement')) {
    this.calculateQualityScore();
  }

  // 3. Default listedBy to owner if not explicitly set
  if (this.isNew && !this.listedBy) {
    this.listedBy = this.owner;
  }

  next();
});

// Soft delete middleware (matches User schema)
PropertySchema.pre(/^find/, function (next) {
  if (!this.getQuery()._id) {
    this.where({ isActive: true });
  }
  next();
});

const Property = mongoose.model('Property', PropertySchema);

module.exports = Property;