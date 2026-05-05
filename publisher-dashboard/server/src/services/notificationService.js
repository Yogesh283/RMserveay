import { Notification } from '../models/Notification.js';

export async function notifyPublisher(userId, { title, body, type = 'system', meta = {} }) {
    return Notification.create({ userId, title, body, type, meta });
}
