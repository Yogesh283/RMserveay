import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        title: { type: String, required: true },
        body: { type: String, default: '' },
        type: { type: String, enum: ['survey_completed', 'earning', 'withdrawal', 'system', 'alert'], default: 'system' },
        read: { type: Boolean, default: false },
        meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    { timestamps: true },
);

export const Notification = mongoose.model('Notification', notificationSchema);
