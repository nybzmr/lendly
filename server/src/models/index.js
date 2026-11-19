import mongoose from 'mongoose';

export const CATEGORIES = ['Sports', 'Electronics', 'Tools', 'Books', 'Clothing', 'Kitchen', 'Outdoor', 'Other'];

const toJSONTransform = (doc, ret) => {
  if (ret._id) {
    ret.id = ret._id.toString();
    delete ret._id;
  }
  delete ret.__v;
  return ret;
};

// ─── User ────────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
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
      select: false,
    },
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);

// ─── Item ────────────────────────────────────────────────────────────────────
const itemSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 80 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    category: { type: String, enum: CATEGORIES, required: true },
    imageUrl: { type: String, default: '' },
    pricePerDay: {
      type: Number,
      required: true,
      validate: { validator: (v) => Number.isInteger(v) && v >= 1, message: 'pricePerDay must be an integer >= 1' },
    },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

itemSchema.index({ owner: 1 });
itemSchema.index({ category: 1 });
itemSchema.index({ createdAt: -1 });
itemSchema.set('toJSON', { transform: toJSONTransform });

export const Item = mongoose.model('Item', itemSchema);

// ─── Booking ──────────────────────────────────────────────────────────────────
const bookingSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    borrower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true },
    pricePerDay: { type: Number, required: true },
    totalFee: { type: Number, required: true },
    message: { type: String, default: '', maxlength: 300 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

bookingSchema.index({ item: 1, status: 1 });
bookingSchema.set('toJSON', { transform: toJSONTransform });

export const Booking = mongoose.model('Booking', bookingSchema);
