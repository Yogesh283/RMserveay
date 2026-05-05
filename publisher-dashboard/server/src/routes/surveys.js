import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { Survey } from '../models/Survey.js';
import { Response as SurveyResponse } from '../models/Response.js';
import { authRequired, attachUser } from '../middleware/auth.js';
import { notifyPublisher } from '../services/notificationService.js';
import { User } from '../models/User.js';
import { Earning } from '../models/Earning.js';

const router = Router();

const questionTypes = ['multiple_choice', 'text', 'rating', 'yes_no', 'dropdown'];

function validateQuestions(questions) {
    if (!Array.isArray(questions)) return 'Questions must be an array';
    const keys = new Set();
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.key || !q.type || !q.label) return `Question ${i}: key, type, label required`;
        if (!questionTypes.includes(q.type)) return `Question ${i}: invalid type`;
        if (keys.has(q.key)) return `Duplicate question key: ${q.key}`;
        keys.add(q.key);
        if (['multiple_choice', 'dropdown'].includes(q.type) && (!q.options || !q.options.length)) {
            return `Question ${q.key}: options required for ${q.type}`;
        }
    }
    return null;
}

/** Public: active survey for respondent form */
router.get('/public/:id', param('id').isMongoId(), async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const survey = await Survey.findById(req.params.id).lean();
    if (!survey || survey.status !== 'active') {
        return res.status(404).json({ message: 'Survey not found' });
    }
    res.json({ survey });
});

router.get('/', authRequired, attachUser, async (req, res) => {
    const { status, from, to } = req.query;
    const filter = { publisherId: req.user._id };
    if (status) filter.status = status;
    if (from || to) {
        filter.updatedAt = {};
        if (from) filter.updatedAt.$gte = new Date(from);
        if (to) filter.updatedAt.$lte = new Date(to);
    }
    const surveys = await Survey.find(filter).sort({ updatedAt: -1 }).lean();
    res.json({ surveys });
});

router.get('/:id/responses', authRequired, attachUser, param('id').isMongoId(), async (req, res) => {
    const survey = await Survey.findOne({ _id: req.params.id, publisherId: req.user._id });
    if (!survey) return res.status(404).json({ message: 'Survey not found' });
    const responses = await SurveyResponse.find({ surveyId: survey._id }).sort({ createdAt: -1 }).lean();
    res.json({ responses });
});

router.get('/:id', authRequired, attachUser, param('id').isMongoId(), async (req, res) => {
    const survey = await Survey.findOne({ _id: req.params.id, publisherId: req.user._id }).lean();
    if (!survey) return res.status(404).json({ message: 'Survey not found' });
    res.json({ survey });
});

router.post(
    '/',
    authRequired,
    attachUser,
    body('title').trim().notEmpty(),
    body('description').optional(),
    body('questions').isArray(),
    body('status').optional().isIn(['draft', 'active', 'inactive']),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const err = validateQuestions(req.body.questions);
        if (err) return res.status(400).json({ message: err });
        const survey = await Survey.create({
            publisherId: req.user._id,
            title: req.body.title,
            description: req.body.description || '',
            status: req.body.status || 'draft',
            questions: req.body.questions.map((q, i) => ({ ...q, order: q.order ?? i })),
            targetAudience: req.body.targetAudience || {},
        });
        res.status(201).json({ survey });
    },
);

router.put(
    '/:id',
    authRequired,
    attachUser,
    param('id').isMongoId(),
    body('title').optional().trim().notEmpty(),
    body('questions').optional().isArray(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const survey = await Survey.findOne({ _id: req.params.id, publisherId: req.user._id });
        if (!survey) return res.status(404).json({ message: 'Survey not found' });
        if (req.body.title) survey.title = req.body.title;
        if (req.body.description !== undefined) survey.description = req.body.description;
        if (req.body.status) survey.status = req.body.status;
        if (req.body.targetAudience) survey.targetAudience = req.body.targetAudience;
        if (req.body.questions) {
            const err = validateQuestions(req.body.questions);
            if (err) return res.status(400).json({ message: err });
            survey.questions = req.body.questions.map((q, i) => ({ ...q, order: q.order ?? i }));
        }
        await survey.save();
        res.json({ survey });
    },
);

router.patch(
    '/:id/status',
    authRequired,
    attachUser,
    param('id').isMongoId(),
    body('status').isIn(['draft', 'active', 'inactive']),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const survey = await Survey.findOne({ _id: req.params.id, publisherId: req.user._id });
        if (!survey) return res.status(404).json({ message: 'Survey not found' });
        survey.status = req.body.status;
        await survey.save();
        res.json({ survey });
    },
);

router.delete('/:id', authRequired, attachUser, param('id').isMongoId(), async (req, res) => {
    const result = await Survey.deleteOne({ _id: req.params.id, publisherId: req.user._id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Survey not found' });
    await SurveyResponse.deleteMany({ surveyId: req.params.id });
    res.json({ ok: true });
});

/** Public: submit response (demo respondent — no auth) */
router.post(
    '/:id/responses',
    param('id').isMongoId(),
    body('answers').isArray(),
    body('respondent').optional().isObject(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const survey = await Survey.findById(req.params.id);
        if (!survey) return res.status(404).json({ message: 'Survey not found' });
        if (survey.status !== 'active') {
            return res.status(400).json({ message: 'Survey is not accepting responses' });
        }
        const keys = new Set(survey.questions.map((q) => q.key));
        for (const a of req.body.answers) {
            if (!keys.has(a.questionKey)) {
                return res.status(400).json({ message: `Unknown question key: ${a.questionKey}` });
            }
        }
        const response = await SurveyResponse.create({
            surveyId: survey._id,
            publisherId: survey.publisherId,
            answers: req.body.answers,
            respondent: req.body.respondent || {},
            completionTimeSec: req.body.completionTimeSec ?? null,
            dropOffAtQuestionKey: req.body.dropOffAtQuestionKey ?? null,
            completed: !req.body.dropOffAtQuestionKey,
        });
        survey.responseCount += 1;
        const rate = Number(process.env.EARNING_PER_RESPONSE_USD || 0.25);
        survey.earningsTotalUsd += rate;
        await survey.save();

        await User.findByIdAndUpdate(survey.publisherId, { $inc: { balanceUsd: rate } });
        const earning = await Earning.create({
            publisherId: survey.publisherId,
            surveyId: survey._id,
            responseId: response._id,
            amountUsd: rate,
        });

        await notifyPublisher(survey.publisherId, {
            title: 'New survey response',
            body: `Your survey "${survey.title}" received a new response.`,
            type: 'survey_completed',
            meta: { surveyId: survey._id, responseId: response._id },
        });
        await notifyPublisher(survey.publisherId, {
            title: 'Earnings update',
            body: `+$${rate.toFixed(2)} credited for a completed response.`,
            type: 'earning',
            meta: { earningId: earning._id },
        });

        res.status(201).json({ response, earningUsd: rate });
    },
);

export default router;
