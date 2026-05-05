import { Router } from 'express';
import { Response as SurveyResponse } from '../models/Response.js';
import { authRequired, attachUser } from '../middleware/auth.js';

const router = Router();

router.get('/users', authRequired, attachUser, async (req, res) => {
    const { gender, location, ageMin, ageMax } = req.query;
    const match = { publisherId: req.user._id };
    if (gender) match['respondent.gender'] = gender;
    if (location) match['respondent.location'] = new RegExp(location, 'i');
    if (ageMin || ageMax) {
        match['respondent.age'] = {};
        if (ageMin) match['respondent.age'].$gte = Number(ageMin);
        if (ageMax) match['respondent.age'].$lte = Number(ageMax);
    }
    const responses = await SurveyResponse.find(match).sort({ createdAt: -1 }).limit(500).populate('surveyId', 'title').lean();
    const users = responses.map((r, i) => ({
        id: r._id,
        survey: r.surveyId?.title,
        age: r.respondent?.age,
        gender: r.respondent?.gender || '—',
        location: r.respondent?.location || '—',
        engaged: r.completed,
        submittedAt: r.createdAt,
    }));
    const engagedCount = users.filter((u) => u.engaged).length;
    res.json({ users, metrics: { total: users.length, engaged: engagedCount, engagementRate: users.length ? Math.round((engagedCount / users.length) * 100) : 0 } });
});

export default router;
