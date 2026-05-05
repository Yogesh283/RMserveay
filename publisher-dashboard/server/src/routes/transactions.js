import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { authRequired, attachUser } from '../middleware/auth.js';
import { notifyPublisher } from '../services/notificationService.js';

const router = Router();

router.get('/', authRequired, attachUser, async (req, res) => {
    const items = await Transaction.find({ publisherId: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ transactions: items });
});

router.post(
    '/withdraw',
    authRequired,
    attachUser,
    body('amountUsd').isFloat({ min: 1 }),
    body('description').optional().trim(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const amount = Number(req.body.amountUsd);
        if (amount > req.user.balanceUsd) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }
        const tx = await Transaction.create({
            publisherId: req.user._id,
            type: 'withdrawal',
            amountUsd: amount,
            status: 'pending',
            description: req.body.description || 'Withdrawal request',
        });
        req.user.balanceUsd -= amount;
        await req.user.save();
        await notifyPublisher(req.user._id, {
            title: 'Withdrawal requested',
            body: `$${amount.toFixed(2)} withdrawal is pending review.`,
            type: 'withdrawal',
            meta: { transactionId: tx._id },
        });
        res.status(201).json({ transaction: tx, balanceUsd: req.user.balanceUsd });
    },
);

export default router;
