import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export function authRequired(req, res, next) {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = payload.sub;
        req.userRole = payload.role;
        next();
    } catch {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}

export async function attachUser(req, res, next) {
    if (!req.userId) return next();
    try {
        req.user = await User.findById(req.userId);
        if (!req.user) {
            return res.status(401).json({ message: 'User not found' });
        }
        next();
    } catch (e) {
        next(e);
    }
}
