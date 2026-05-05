import mongoose from 'mongoose';

const earningSchema = new mongoose.Schema(
    {
        publisherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true },
        responseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Response', required: true },
        amountUsd: { type: Number, required: true },
        description: { type: String, default: 'Survey response reward' },
    },
    { timestamps: true },
);

earningSchema.index({ publisherId: 1, createdAt: -1 });

export const Earning = mongoose.model('Earning', earningSchema);
