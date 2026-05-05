import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
    {
        publisherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        type: { type: String, enum: ['withdrawal', 'adjustment', 'payout'], required: true },
        amountUsd: { type: Number, required: true },
        status: { type: String, enum: ['pending', 'completed', 'rejected'], default: 'pending' },
        description: { type: String, default: '' },
        meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    { timestamps: true },
);

export const Transaction = mongoose.model('Transaction', transactionSchema);
