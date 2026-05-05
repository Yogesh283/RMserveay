import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
    {
        questionKey: { type: String, required: true },
        value: { type: mongoose.Schema.Types.Mixed, required: true },
    },
    { _id: false },
);

const respondentSchema = new mongoose.Schema(
    {
        age: { type: Number, default: null },
        gender: { type: String, default: '' },
        location: { type: String, default: '' },
    },
    { _id: false },
);

const responseSchema = new mongoose.Schema(
    {
        surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true, index: true },
        publisherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        answers: [answerSchema],
        respondent: { type: respondentSchema, default: () => ({}) },
        completed: { type: Boolean, default: true },
        completionTimeSec: { type: Number, default: null },
        dropOffAtQuestionKey: { type: String, default: null },
    },
    { timestamps: true },
);

export const Response = mongoose.model('Response', responseSchema);
