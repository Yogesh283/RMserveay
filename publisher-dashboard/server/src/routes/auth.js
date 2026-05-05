import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { authRequired, attachUser } from '../middleware/auth.js';

const router = Router();

router.post(
    '/register',
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, password, name, company } = req.body;
        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(409).json({ message: 'Email already registered' });
        }
        const user = await User.create({ email, password, name, company: company || '' });
        const token = signToken(user);
        return res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                company: user.company,
                balanceUsd: user.balanceUsd,
            },
        });
    },
);

router.post(
    '/login',
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        if (user.role !== 'publisher') {
            return res.status(403).json({ message: 'Publisher access only' });
        }
        const token = signToken(user);
        return res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                company: user.company,
                balanceUsd: user.balanceUsd,
            },
        });
    },
);

router.get('/me', authRequired, attachUser, (req, res) => {
    const u = req.user;
    res.json({
        user: {
            id: u._id,
            name: u.name,
            email: u.email,
            company: u.company,
            balanceUsd: u.balanceUsd,
            paymentDetails: u.paymentDetails,
            notificationPrefs: u.notificationPrefs,
            createdAt: u.createdAt,
        },
    });
});

router.patch(
    '/profile',
    authRequired,
    attachUser,
    body('name').optional().trim().notEmpty(),
    body('company').optional().trim(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { name, company, paymentDetails, notificationPrefs } = req.body;
        if (name) req.user.name = name;
        if (company !== undefined) req.user.company = company;
        if (paymentDetails) {
            const cur = req.user.paymentDetails?.toObject ? req.user.paymentDetails.toObject() : { ...req.user.paymentDetails };
            req.user.paymentDetails = { ...cur, ...paymentDetails };
        }
        if (notificationPrefs) {
            const curN = req.user.notificationPrefs?.toObject ? req.user.notificationPrefs.toObject() : { ...req.user.notificationPrefs };
            req.user.notificationPrefs = { ...curN, ...notificationPrefs };
        }
        await req.user.save();
        res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email, company: req.user.company, paymentDetails: req.user.paymentDetails, notificationPrefs: req.user.notificationPrefs } });
    },
);

router.post(
    '/change-password',
    authRequired,
    attachUser,
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 }),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const user = await User.findById(req.user._id).select('+password');
        const { currentPassword, newPassword } = req.body;
        if (!(await user.comparePassword(currentPassword))) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        user.password = newPassword;
        await user.save();
        res.json({ message: 'Password updated' });
    },
);

export default router;
