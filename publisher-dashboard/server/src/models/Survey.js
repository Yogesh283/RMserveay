import mongoose from 'mongoose';

const questionLogicSchema = new mongoose.Schema(
    {
        whenQuestionKey: { type: String, default: '' },
        operator: { type: String, enum: ['equals', 'not_equals', 'contains', 'is_empty'], default: 'equals' },
        value: { type: mongoose.Schema.Types.Mixed, default: null },
        showQuestionKeys: [{ type: String }],
        hideQuestionKeys: [{ type: String }],
    },
    { _id: false },
);

const questionSchema = new mongoose.Schema(
    {
        key: { type: String, required: true },
        type: {
            type: String,
            enum: ['multiple_choice', 'text', 'rating', 'yes_no', 'dropdown'],
            required: true,
        },
        label: { type: String, required: true },
        description: { type: String, default: '' },
        required: { type: Boolean, default: false },
        options: [{ type: String }],
        minRating: { type: Number, default: 1 },
        maxRating: { type: Number, default: 5 },
        order: { type: Number, default: 0 },
        logic: { type: questionLogicSchema, default: undefined },
    },
    { _id: false },
);

const surveySchema = new mongoose.Schema(
    {
        publisherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        title: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        status: { type: String, enum: ['draft', 'active', 'inactive'], default: 'draft' },
        questions: [questionSchema],
        targetAudience: {
            ageMin: { type: Number, default: null },
            ageMax: { type: Number, default: null },
            genders: [{ type: String }],
            locations: [{ type: String }],
        },
        responseCount: { type: Number, default: 0 },
        earningsTotalUsd: { type: Number, default: 0 },
    },
    { timestamps: true },
);

export const Survey = mongoose.model('Survey', surveySchema);
