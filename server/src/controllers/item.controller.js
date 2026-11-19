import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Item, Booking } from '../models/index.js';
import { CATEGORIES } from '../models/index.js';
import asyncHandler from '../utils/asyncHandler.js';
import escapeRegex from '../utils/escapeRegex.js';
import { todayUTC } from '../utils/dates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads');

/** Delete a file from uploads silently (ignore missing-file errors). */
function unlinkImage(imageUrl) {
  if (!imageUrl) return;
  // imageUrl is like '/uploads/filename.jpg'
  const filename = path.basename(imageUrl);
  const filepath = path.join(uploadsDir, filename);
  fs.unlink(filepath, () => {}); // ignore errors
}

/** Validate and coerce item fields from multipart strings. Returns { data } or { error }. */
function parseItemFields(body, file, isUpdate = false) {
  const data = {};
  const errors = [];

  const title = typeof body.title === 'string' ? body.title.trim() : undefined;
  const description = typeof body.description === 'string' ? body.description.trim() : undefined;
  const category = typeof body.category === 'string' ? body.category.trim() : undefined;
  const rawPrice = body.pricePerDay;

  if (!isUpdate || title !== undefined) {
    if (!title || title.length < 3 || title.length > 80) {
      errors.push('title must be between 3 and 80 characters');
    } else {
      data.title = title;
    }
  }

  if (!isUpdate || description !== undefined) {
    if (!description || description.length < 1 || description.length > 1000) {
      errors.push('description must be between 1 and 1000 characters');
    } else {
      data.description = description;
    }
  }

  if (!isUpdate || category !== undefined) {
    if (!category || !CATEGORIES.includes(category)) {
      errors.push(`category must be one of: ${CATEGORIES.join(', ')}`);
    } else {
      data.category = category;
    }
  }

  if (!isUpdate || rawPrice !== undefined) {
    const price = parseInt(rawPrice, 10);
    if (isNaN(price) || price < 1) {
      errors.push('pricePerDay must be an integer >= 1');
    } else {
      data.pricePerDay = price;
    }
  }

  if (file) {
    data.imageUrl = `/uploads/${file.filename}`;
  }

  if (errors.length) {
    return { error: errors[0], errors };
  }
  return { data };
}

// ─── GET /api/items ───────────────────────────────────────────────────────────
export const getItems = asyncHandler(async (req, res) => {
  const { search, category, page: pageStr, limit: limitStr } = req.query;

  const filter = {};

  if (search && typeof search === 'string' && search.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ title: pattern }, { description: pattern }];
  }

  if (category && CATEGORIES.includes(category)) {
    filter.category = category;
  }

  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(limitStr, 10) || 12));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Item.find(filter)
      .populate('owner', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Item.countDocuments(filter),
  ]);

  const pages = Math.ceil(total / limit);
  res.status(200).json({ items, total, page, pages });
});

// ─── GET /api/items/mine ──────────────────────────────────────────────────────
export const getMyItems = asyncHandler(async (req, res) => {
  const items = await Item.find({ owner: req.user.id })
    .populate('owner', 'name')
    .sort({ createdAt: -1 });
  res.status(200).json({ items });
});

// ─── GET /api/items/:id ───────────────────────────────────────────────────────
export const getItemById = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id).populate('owner', 'name');
  if (!item) return res.status(404).json({ message: 'Item not found' });
  res.status(200).json({ item });
});

// ─── POST /api/items ──────────────────────────────────────────────────────────
export const createItem = asyncHandler(async (req, res) => {
  const { data, error, errors } = parseItemFields(req.body, req.file, false);
  if (error) {
    if (req.file) unlinkImage(`/uploads/${req.file.filename}`);
    return res.status(400).json({ message: error, errors });
  }

  const item = await Item.create({ ...data, owner: req.user.id });
  await item.populate('owner', 'name');
  res.status(201).json({ item });
});

// ─── PUT /api/items/:id ───────────────────────────────────────────────────────
export const updateItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) {
    if (req.file) unlinkImage(`/uploads/${req.file.filename}`);
    return res.status(404).json({ message: 'Item not found' });
  }
  if (item.owner.toString() !== req.user.id) {
    if (req.file) unlinkImage(`/uploads/${req.file.filename}`);
    return res.status(403).json({ message: 'Not authorised to edit this item' });
  }

  const { data, error, errors } = parseItemFields(req.body, req.file, true);
  if (error) {
    if (req.file) unlinkImage(`/uploads/${req.file.filename}`);
    return res.status(400).json({ message: error, errors });
  }

  // If a new image was uploaded, delete the old one
  if (req.file && item.imageUrl) {
    unlinkImage(item.imageUrl);
  }

  Object.assign(item, data);
  await item.save();
  await item.populate('owner', 'name');
  res.status(200).json({ item });
});

// ─── PATCH /api/items/:id/availability ───────────────────────────────────────
export const toggleAvailability = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Item not found' });
  if (item.owner.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not authorised to update this item' });
  }

  if (typeof req.body.isAvailable !== 'boolean') {
    return res.status(400).json({ message: 'isAvailable must be a boolean' });
  }

  item.isAvailable = req.body.isAvailable;
  await item.save();
  await item.populate('owner', 'name');
  res.status(200).json({ item });
});

// ─── DELETE /api/items/:id ────────────────────────────────────────────────────
export const deleteItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Item not found' });
  if (item.owner.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not authorised to delete this item' });
  }

  // 409 if the item has any pending or accepted bookings
  const activeBooking = await Booking.exists({
    item: item._id,
    status: { $in: ['pending', 'accepted'] },
  });
  if (activeBooking) {
    return res.status(409).json({ message: 'Cannot delete item with pending or accepted bookings' });
  }

  const imageUrl = item.imageUrl;
  await item.deleteOne();
  if (imageUrl) unlinkImage(imageUrl);

  res.status(200).json({ message: 'Item deleted' });
});

// ─── GET /api/items/:id/booked-dates ─────────────────────────────────────────
export const getBookedDates = asyncHandler(async (req, res) => {
  const today = todayUTC();
  const ranges = await Booking.find({
    item:    req.params.id,
    status:  'accepted',
    endDate: { $gte: today },
  }).select('startDate endDate -_id');
  res.status(200).json({ ranges });
});
