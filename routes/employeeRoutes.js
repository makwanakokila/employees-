import express from 'express';
import { createEmployee, getEmployees, getEmployee, updateEmployee, deleteEmployee } from '../controllers/employeeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect(['admin']), createEmployee);
router.get('/', protect(['admin']), getEmployees);
router.get('/:id', protect(['admin']), getEmployee);
router.put('/:id', protect(['admin']), updateEmployee);
router.delete('/:id', protect(['admin']), deleteEmployee);

export default router;


