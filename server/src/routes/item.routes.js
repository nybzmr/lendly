import { Router } from 'express';
import {
  getItems,
  getMyItems,
  getItemById,
  createItem,
  updateItem,
  toggleAvailability,
  deleteItem,
  getBookedDates,
} from '../controllers/item.controller.js';
import protect from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = Router();

// /mine MUST be registered before /:id
router.get('/', getItems);
router.get('/mine', protect, getMyItems);
router.get('/:id', getItemById);
router.post('/', protect, uploadSingle('image'), createItem);
router.put('/:id', protect, uploadSingle('image'), updateItem);
router.patch('/:id/availability', protect, toggleAvailability);
router.delete('/:id', protect, deleteItem);
router.get('/:id/booked-dates', getBookedDates);

export default router;
