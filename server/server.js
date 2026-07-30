import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import profilesRouter from './routes/profiles.js';
import swipesRouter from './routes/swipes.js';
import matchesRouter from './routes/matches.js';
import aiRouter from './routes/ai.js';
import { scheduleMessageTTLJob } from './services/cleanup.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Headers (Helmet)
app.use(helmet());

// CORS Configuration (Restricted Origins for Zero-Trust API Proxying)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',');
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Zero-Trust CORS Policy Violation: Access Denied'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Rate Limiting (Prevent DDoS / Abusive Automated Swiping)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  message: { error: 'Too many requests', message: 'Rate limit exceeded. Please try again later.' },
});
app.use('/api/', apiLimiter);

// System Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    architecture: 'Zero-Trust API Gateway with Private Subnet Proxying',
    timestamp: new Date().toISOString(),
  });
});

// Route Registrations
app.use('/api/profiles', profilesRouter);
app.use('/api/swipe', swipesRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/ai', aiRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[API Gateway Error]:', err);
  res.status(err.status || 500).json({
    error: 'Internal Gateway Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred.',
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`[Zero-Trust API Gateway] Running on port ${PORT}`);
  console.log(`[Architecture] Front-end requests proxied via /api/*`);
  console.log(`[Security] DB & AI Services isolated in private subnet`);
  console.log(`[TTL Policy] 1-Year Message Auto-Expiration Active`);
  console.log(`=======================================================`);

  // Start background 1-Year Chat Message Expiration & Purge Routine
  scheduleMessageTTLJob();
});
