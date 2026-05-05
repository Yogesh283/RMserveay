import { Router } from 'express';
import { Survey } from '../models/Survey.js';
import { Response as SurveyResponse } from '../models/Response.js';
import { Earning } from '../models/Earning.js';
import { authRequired, attachUser } from '../middleware/auth.js';

const router = Router();

router.get('/stats', authRequired, attachUser, async (req, res) => {
    const publisherId = req.user._id;
    const [totalSurveys, activeSurveys, agg] = await Promise.all([
        Survey.countDocuments({ publisherId }),
        Survey.countDocuments({ publisherId, status: 'active' }),
        SurveyResponse.aggregate([
            { $match: { publisherId } },
            { $group: { _id: null, total: { $sum: 1 } } },
        ]),
    ]);
    const totalResponses = agg[0]?.total ?? 0;
    res.json({
        totalSurveys,
        activeSurveys,
        totalResponses,
        totalEarningsUsd: req.user.balanceUsd,
    });
});

/** Time series for line chart — last 14 days responses */
router.get('/performance', authRequired, attachUser, async (req, res) => {
    const publisherId = req.user._id;
    const days = 14;
    const start = new Date();
    start.setDate(start.getDate() - days);
    const rows = await SurveyResponse.aggregate([
        { $match: { publisherId, createdAt: { $gte: start } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);
    res.json({ series: rows.map((r) => ({ date: r._id, responses: r.count })) });
});

/** Bar chart — responses per survey */
router.get('/responses-by-survey', authRequired, attachUser, async (req, res) => {
    const publisherId = req.user._id;
    const data = await Survey.find({ publisherId }).select('title responseCount earningsTotalUsd').lean();
    res.json({
        items: data.map((s) => ({ name: s.title, responses: s.responseCount, earnings: s.earningsTotalUsd })),
    });
});

/** Pie — completion vs drop-off (mock split from completed flag) */
router.get('/completion-split', authRequired, attachUser, async (req, res) => {
    const publisherId = req.user._id;
    const [completed, dropped] = await Promise.all([
        SurveyResponse.countDocuments({ publisherId, completed: true }),
        SurveyResponse.countDocuments({ publisherId, completed: false }),
    ]);
    res.json({
        segments: [
            { name: 'Completed', value: completed, color: '#42B72A' },
            { name: 'Drop-off', value: dropped, color: '#FA383E' },
        ],
    });
});

router.get('/recent-activity', authRequired, attachUser, async (req, res) => {
    const publisherId = req.user._id;
    const recent = await SurveyResponse.find({ publisherId })
        .sort({ createdAt: -1 })
        .limit(12)
        .populate('surveyId', 'title')
        .lean();
    const activity = recent.map((r) => ({
        id: r._id,
        time: r.createdAt,
        text: r.surveyId?.title ? `Response on “${r.surveyId.title}”` : 'New response',
        type: r.completed ? 'ok' : 'alert',
    }));
    res.json({ activity });
});

export default router;
