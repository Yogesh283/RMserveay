import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const paymentDetailsSchema = new mongoose.Schema(
    {
        upi: { type: String, default: '' },
        bankName: { type: String, default: '' },
        accountNumber: { type: String, default: '' },
        ifsc: { type: String, default: '' },
    },
    { _id: false },
);

const notificationPrefsSchema = new mongoose.Schema(
    {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        earnings: { type: Boolean, default: true },
        surveyComplete: { type: Boolean, default: true },
    },
    { _id: false },
);

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, minlength: 6, select: false },
        role: { type: String, enum: ['publisher'], default: 'publisher' },
        company: { type: String, default: '' },
        avatarUrl: { type: String, default: '' },
        balanceUsd: { type: Number, default: 0 },
        paymentDetails: { type: paymentDetailsSchema, default: () => ({}) },
        notificationPrefs: { type: notificationPrefsSchema, default: () => ({}) },
    },
    { timestamps: true },
);

userSchema.pre('save', async function hashPassword(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
    return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model('User', userSchema);
