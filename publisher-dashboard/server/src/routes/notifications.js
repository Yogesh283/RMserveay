import { Router } from 'express';
import { Notification } from '../models/Notification.js';
import { authRequired, attachUser } from '../middleware/auth.js';

const router = Router();

router.get('/', authRequired, attachUser, async (req, res) => {
    const items = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ notifications: items });
});

router.patch('/:id/read', authRequired, attachUser, async (req, res) => {
    const n = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { read: true }, { new: true });
    if (!n) return res.status(404).json({ message: 'Not found' });
    res.json({ notification: n });
});

router.post('/read-all', authRequired, attachUser, async (req, res) => {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    res.json({ ok: true });
});

export default router;
