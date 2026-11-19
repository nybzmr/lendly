import { Booking } from '../models/index.js';
import { Item } from '../models/index.js';
import asyncHandler from '../utils/asyncHandler.js';
import { parseDateOnly, todayUTC, daysInclusive } from '../utils/dates.js';

// ─── Shared overlap helper ────────────────────────────────────────────────────
/**
 * Returns true if any ACCEPTED booking for itemId overlaps [start, end].
 * Overlap condition: existing.startDate <= newEnd AND existing.endDate >= newStart.
 * @param {string|ObjectId} itemId
 * @param {Date} start
 * @param {Date} end
 * @param {string|null} excludeBookingId  – pass the booking's own id when re-checking on accept
 */
async function hasAcceptedOverlap(itemId, start, end, excludeBookingId = null) {
  const filter = {
    item: itemId,
    status: 'accepted',
    startDate: { $lte: end },
    endDate: { $gte: start },
  };
  if (excludeBookingId) {
    filter._id = { $ne: excludeBookingId };
  }
  const count = await Booking.countDocuments(filter);
  return count > 0;
}

// ─── POST /api/bookings ───────────────────────────────────────────────────────
export const createBooking = asyncHandler(async (req, res) => {
  const { itemId, startDate: startStr, endDate: endStr, message } = req.body;

  // --- find item ---
  const item = await Item.findById(itemId);
  if (!item) return res.status(404).json({ message: 'Item not found' });

  // --- availability ---
  if (!item.isAvailable) return res.status(400).json({ message: 'Item is not available' });

  // --- not own item ---
  if (item.owner.toString() === req.user.id) {
    return res.status(403).json({ message: 'You cannot book your own item' });
  }

  // --- parse & validate dates ---
  const start = parseDateOnly(startStr);
  const end   = parseDateOnly(endStr);
  const today = todayUTC();

  if (!start || !end) {
    return res.status(400).json({ message: 'Dates must be in YYYY-MM-DD format' });
  }
  if (start < today) {
    return res.status(400).json({ message: 'Start date must be today or in the future' });
  }
  if (end < start) {
    return res.status(400).json({ message: 'End date must be on or after start date' });
  }
  const days = daysInclusive(start, end);
  if (days > 30) {
    return res.status(400).json({ message: 'Booking range cannot exceed 30 days' });
  }

  // --- overlap check against accepted bookings ---
  if (await hasAcceptedOverlap(item._id, start, end)) {
    return res.status(409).json({ message: 'These dates overlap with an existing accepted booking' });
  }

  // --- create ---
  const totalFee    = days * item.pricePerDay;
  const bookingData = {
    item:        item._id,
    borrower:    req.user.id,
    owner:       item.owner,
    startDate:   start,
    endDate:     end,
    days,
    pricePerDay: item.pricePerDay,
    totalFee,
    message:     typeof message === 'string' ? message.trim().slice(0, 300) : '',
    status:      'pending',
  };

  const booking = await Booking.create(bookingData);
  await booking.populate([
    { path: 'item',     select: 'id title imageUrl pricePerDay' },
    { path: 'owner',    select: 'id name' },
    { path: 'borrower', select: 'id name email' },
  ]);
  res.status(201).json({ booking });
});

// ─── GET /api/bookings/borrowing ──────────────────────────────────────────────
export const getBorrowing = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ borrower: req.user.id })
    .populate('item',     'id title imageUrl pricePerDay')
    .populate('owner',    'id name')
    .sort({ createdAt: -1 });
  res.status(200).json({ bookings });
});

// ─── GET /api/bookings/lending ────────────────────────────────────────────────
export const getLending = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ owner: req.user.id })
    .populate('item',     'id title imageUrl pricePerDay')
    .populate('borrower', 'id name email')
    .sort({ createdAt: -1 });
  res.status(200).json({ bookings });
});

// ─── PATCH /api/bookings/:id/status ──────────────────────────────────────────
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status: newStatus } = req.body;
  const userId = req.user.id;

  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  const current   = booking.status;
  const isOwner   = booking.owner.toString()    === userId;
  const isBorrower = booking.borrower.toString() === userId;

  // ── Transition table ──────────────────────────────────────────────────────
  // pending  → accepted  : owner only
  // pending  → rejected  : owner only
  // pending  → cancelled : borrower only
  // accepted → cancelled : borrower only
  // accepted → completed : owner only
  // Everything else → 400 (wrong state) or 403 (wrong user)

  if (newStatus === 'accepted' || newStatus === 'rejected') {
    if (current !== 'pending') {
      return res.status(400).json({ message: `Cannot transition from ${current} to ${newStatus}` });
    }
    if (!isOwner) {
      return res.status(403).json({ message: 'Only the item owner can accept or reject bookings' });
    }
    // On accept: re-run overlap check (exclude this booking's own id)
    if (newStatus === 'accepted') {
      if (await hasAcceptedOverlap(booking.item, booking.startDate, booking.endDate, booking._id)) {
        return res.status(409).json({ message: 'These dates now overlap with another accepted booking' });
      }
    }
  } else if (newStatus === 'cancelled') {
    if (current !== 'pending' && current !== 'accepted') {
      return res.status(400).json({ message: `Cannot cancel a booking with status ${current}` });
    }
    if (!isBorrower) {
      return res.status(403).json({ message: 'Only the borrower can cancel a booking' });
    }
  } else if (newStatus === 'completed') {
    if (current !== 'accepted') {
      return res.status(400).json({ message: `Cannot transition from ${current} to completed` });
    }
    if (!isOwner) {
      return res.status(403).json({ message: 'Only the item owner can mark a booking as completed' });
    }
  } else {
    return res.status(400).json({ message: `Invalid status: ${newStatus}` });
  }

  booking.status = newStatus;
  await booking.save();

  await booking.populate([
    { path: 'item',     select: 'id title imageUrl pricePerDay' },
    { path: 'owner',    select: 'id name' },
    { path: 'borrower', select: 'id name email' },
  ]);
  res.status(200).json({ booking });
});
