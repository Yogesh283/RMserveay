import { Router } from 'express';
import { query } from 'express-validator';
import { Earning } from '../models/Earning.js';
import { authRequired, attachUser } from '../middleware/auth.js';

const router = Router();

router.get('/summary', authRequired, attachUser, async (req, res) => {
    res.json({ balanceUsd: req.user.balanceUsd });
});

router.get(
    '/chart',
    authRequired,
    attachUser,
    query('range').optional().isIn(['7d', '30d', '90d']),
    async (req, res) => {
        const range = req.query.range || '30d';
        const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
        const start = new Date();
        start.setDate(start.getDate() - days);
        const rows = await Earning.aggregate([
            { $match: { publisherId: req.user._id, createdAt: { $gte: start } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    total: { $sum: '$amountUsd' },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        res.json({ series: rows.map((r) => ({ date: r._id, amount: r.total })) });
    },
);

router.get('/list', authRequired, attachUser, async (req, res) => {
    const items = await Earning.find({ publisherId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(200)
        .populate('surveyId', 'title')
        .lean();
    res.json({
        earnings: items.map((e) => ({
            id: e._id,
            amountUsd: e.amountUsd,
            description: e.description,
            surveyTitle: e.surveyId?.title,
            createdAt: e.createdAt,
        })),
    });
});

export default router;
