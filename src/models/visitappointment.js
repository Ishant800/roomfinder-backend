const mongoose = require('mongoose');
const { Schema } = mongoose;
const { AppointmentStatus, WalkthroughType } = require('./enum');

// ============================================================================
// SUB-SCHEMAS
// ============================================================================

const SpecialRequestsSchema = new Schema(
  {
    inspectOriginalLalpurja: { type: Boolean, default: false },
    verifyRoadRightOfWay: { type: Boolean, default: false },
    daylightExposureCheck: { type: Boolean, default: false },
    priceNegotiationMeeting: { type: Boolean, default: false },
    bringFamilyMember: { type: Boolean, default: false }, // Common in Nepal
  },
  { _id: false }
);

const NotificationStatusSchema = new Schema(
  {
    ownerNotified: { type: Boolean, default: false },
    seekerNotified: { type: Boolean, default: false },
    inspectorNotified: { type: Boolean, default: false },
    // Useful for retrying failed SMS/WhatsApp deliveries
    lastNotificationAttemptAt: { type: Date, default: null }, 
  },
  { _id: false }
);

// ============================================================================
// ROOT APPOINTMENT SCHEMA
// ============================================================================

const VisitAppointmentSchema = new Schema(
  {
    // --- Core References ---
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property reference is required'],
      index: true,
    },
    seeker: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seeker (Buyer/Tenant) account reference is required'],
      index: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner (Landlord/Seller) reference is required'],
      index: true,
    },
    assignedInspector: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true, // For platform-managed or agency-managed visits
    },

    // --- Visit Details ---
    walkthroughType: {
      type: String,
      enum: Object.values(WalkthroughType),
      default: WalkthroughType.SELF_WALKTHROUGH,
      required: true,
    },
    appointmentDateAd: {
      type: Date,
      required: [true, 'Gregorian appointment date (AD) is required'],
      index: true,
    },
    appointmentDateBs: {
      type: String,
      required: [true, 'Nepali Bikram Sambat date (BS) is required'],
      trim: true,
    }, // e.g., '2082-Jestha-02'
    timeSlot: {
      type: String,
      required: [true, 'Time slot is required'],
      trim: true,
    }, // e.g., '11:30 AM - 12:30 PM'

    // --- Visitor Info (May differ from Seeker if booking for family/friend) ---
    visitorName: {
      type: String,
      required: [true, 'Actual visitor name is required'],
      trim: true,
    },
    visitorRelationToSeeker: {
      type: String,
      enum: ['SELF', 'SPOUSE', 'PARENT', 'SIBLING', 'FRIEND', 'AGENT', 'OTHER'],
      default: 'SELF',
    },
    visitorPhone: {
      type: String,
      required: [true, 'Visitor contact number is required'],
      trim: true,
      match: [/^\+977-9[78]\d{8}$/, 'Please provide a valid Nepali mobile number'],
    },
    visitorVehicleType: {
      type: String,
      enum: ['NONE', '2_WHEELER_MOTORBIKE', '4_WHEELER_SEDAN', '4_WHEELER_SUV'],
      default: 'NONE',
    }, // Helps owner prepare parking

    specialRequests: {
      type: SpecialRequestsSchema,
      default: () => ({}),
    },

    meetingPointGeometry: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        validate: {
          validator: function(v) {
            return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
          },
          message: 'Coordinates must be valid [lng, lat]',
        },
      },
    },

    // --- Lifecycle & Status ---
    status: {
      type: String,
      enum: Object.values(AppointmentStatus),
      default: AppointmentStatus.REQUESTED,
      index: true,
    },
    
    // --- Advanced: Cancellation & Completion Tracking ---
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    postVisitNotes: {
      type: String,
      trim: true,
      maxlength: 500, // Optional feedback from seeker or inspector
    },

    // --- System Tracking ---
    notificationStatus: {
      type: NotificationStatusSchema,
      default: () => ({}),
    },
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

// 1. PRO-Level Anti-Collision Index: Prevents double bookings on the same property/date/slot
// The partialFilterExpression ensures CANCELLED appointments don't block new bookings for that slot.
VisitAppointmentSchema.index(
  { property: 1, appointmentDateAd: 1, timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: { 
      status: { $nin: ['CANCELLED', 'REJECTED'] } // Adjust based on your exact enum values
    },
  }
);

// 2. Quick lookup for a user's upcoming appointments (Seeker or Owner)
VisitAppointmentSchema.index({ seeker: 1, appointmentDateAd: 1, status: 1 });
VisitAppointmentSchema.index({ owner: 1, appointmentDateAd: 1, status: 1 });

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Auto-populate owner from Property if not explicitly provided during creation
VisitAppointmentSchema.pre('save', async function (next) {
  if (this.isNew && !this.owner) {
    const Property = mongoose.model('Property');
    const propertyDoc = await Property.findById(this.property).select('owner').lean();
    if (propertyDoc) {
      this.owner = propertyDoc.owner;
    }
  }
  next();
});

const VisitAppointment = mongoose.model('VisitAppointment', VisitAppointmentSchema);

module.exports = VisitAppointment;