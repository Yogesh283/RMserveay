import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authRequired } from '../middleware/auth.js';

const router = Router();

/** Mock AI suggestions — deterministic from topic */
router.post(
    '/suggestions',
    authRequired,
    body('topic').trim().notEmpty(),
    body('audience').optional().trim(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const { topic, audience } = req.body;
        const base = topic.slice(0, 60);
        const suggestions = {
            title: `${base} — quick pulse`,
            description: audience ? `Target: ${audience}. Gather structured feedback on ${base}.` : `Short survey about ${base}.`,
            insights: [
                'Keep the first question multiple choice to boost completion.',
                'Add a rating scale before open text to anchor sentiment.',
                'Use conditional logic to skip irrelevant sections.',
            ],
            questions: [
                {
                    key: 'q_sat',
                    type: 'rating',
                    label: `How satisfied are you with ${base}?`,
                    required: true,
                    minRating: 1,
                    maxRating: 5,
                },
                {
                    key: 'q_freq',
                    type: 'multiple_choice',
                    label: 'How often do you interact with this topic?',
                    required: true,
                    options: ['Daily', 'Weekly', 'Monthly', 'Rarely'],
                },
                {
                    key: 'q_detail',
                    type: 'text',
                    label: 'What would you improve?',
                    required: false,
                },
            ],
        };
        res.json(suggestions);
    },
);

export default router;
