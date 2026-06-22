import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import hpp from 'hpp';

import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import userRoutes from './routes/userRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import dmRoutes from './routes/dmRoutes.js';
import storyRoutes from './routes/storyRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initSocket } from './socket.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS origins ────────────────────────────────────────
// FRONTEND_URL can be comma-separated for multiple allowed origins.
// e.g. "https://sociogram.vercel.app,http://localhost:5173"
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// ── Health Check ─────────────────────────────────────────
// Placed before rate limiters and security headers so internal pings never timeout
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Middleware ──────────────────────────────────────────

// 1. CORS (Must be early so OPTIONS requests are handled quickly)
app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (e.g. curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
}));

// 2. Security HTTP headers
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

// 3. Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// 4. Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. Data sanitization against XSS (Must be after parsers)
app.use(xss());

// 6. Prevent HTTP Parameter Pollution (Must be after parsers)
app.use(hpp());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Routes ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/conversations', dmRoutes);
app.use('/api/stories', storyRoutes);

// ── Error Handler ──────────────────────────────────────
app.use(errorHandler);

// ── HTTP + Socket.io server ────────────────────────────
const httpServer = createServer(app);
initSocket(httpServer, allowedOrigins);

// ── Start ──────────────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🚀 Sociogram API running at http://0.0.0.0:${PORT}`);
  console.log(`  📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`  ⚡ Socket.io enabled`);
  console.log(`  🌐 CORS origins: ${allowedOrigins.join(', ')}\n`);
});
