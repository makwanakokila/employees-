import express from 'express';
import { markAttendance, dailySummary, listEmployeeAttendance, checkoutAttendance } from '../controllers/attendanceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect(['admin', 'employee']), markAttendance);
router.post('/checkout', protect(['admin', 'employee']), checkoutAttendance);
router.get('/summary', protect(['admin']), dailySummary);
router.get('/employee', protect(['admin', 'employee']), listEmployeeAttendance);

export default router;


