import { Router } from 'express';
import {
  createBooking,
  getBorrowing,
  getLending,
  updateBookingStatus,
} from '../controllers/booking.controller.js';
import protect from '../middleware/auth.js';

const router = Router();

router.use(protect); // all booking routes require auth

router.post('/', createBooking);
router.get('/borrowing', getBorrowing);
router.get('/lending', getLending);
router.patch('/:id/status', updateBookingStatus);

export default router;
