import { Router } from 'express';
import { Survey } from '../models/Survey.js';
import { Response as SurveyResponse } from '../models/Response.js';
import { authRequired, attachUser } from '../middleware/auth.js';

const router = Router();

router.get('/overview', authRequired, attachUser, async (req, res) => {
    const publisherId = req.user._id;
    const [totalResponses, completed, dropped, surveys] = await Promise.all([
        SurveyResponse.countDocuments({ publisherId }),
        SurveyResponse.countDocuments({ publisherId, completed: true }),
        SurveyResponse.countDocuments({ publisherId, completed: false }),
        Survey.find({ publisherId }).select('title responseCount').lean(),
    ]);
    const completionRate = totalResponses ? Math.round((completed / totalResponses) * 100) : 0;
    const dropOffs = await SurveyResponse.aggregate([
        { $match: { publisherId, dropOffAtQuestionKey: { $ne: null } } },
        { $group: { _id: '$dropOffAtQuestionKey', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
    ]);
    res.json({
        completionRate,
        totalResponses,
        completed,
        dropped,
        dropOffByQuestion: dropOffs.map((d) => ({ questionKey: d._id, count: d.count })),
        surveys,
    });
});

export default router;
