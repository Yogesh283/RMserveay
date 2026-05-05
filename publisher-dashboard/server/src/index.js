import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database.js';
import authRoutes from './routes/auth.js';
import surveyRoutes from './routes/surveys.js';
import dashboardRoutes from './routes/dashboard.js';
import earningsRoutes from './routes/earnings.js';
import transactionRoutes from './routes/transactions.js';
import notificationRoutes from './routes/notifications.js';
import analyticsRoutes from './routes/analytics.js';
import audienceRoutes from './routes/audience.js';
import aiRoutes from './routes/ai.js';

const app = express();
const PORT = process.env.PORT || 4000;
const origin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

app.use(cors({ origin, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audience', audienceRoutes);
app.use('/api/ai', aiRoutes);

app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
});

await connectDatabase();
app.listen(PORT, () => {
    console.log(`RM Survey Publisher API http://localhost:${PORT}`);
});
