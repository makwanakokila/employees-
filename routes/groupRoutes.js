import express from 'express';
import { createGroup, getGroups, updateGroup, deleteGroup, assignMembers, getMyGroups } from '../controllers/groupController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect(['admin']), createGroup);
router.get('/', protect(['admin']), getGroups);
router.get('/my', protect(['admin', 'employee']), getMyGroups);
router.put('/:id', protect(['admin']), updateGroup);
router.delete('/:id', protect(['admin']), deleteGroup);
router.post('/:id/members', protect(['admin']), assignMembers);

export default router;


