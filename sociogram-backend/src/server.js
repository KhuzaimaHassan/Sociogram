import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import userRoutes from './routes/userRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import dmRoutes from './routes/dmRoutes.js';
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

// ── Middleware ──────────────────────────────────────────
app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (e.g. curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Routes ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/conversations', dmRoutes);

// ── Error Handler ──────────────────────────────────────
app.use(errorHandler);

// ── HTTP + Socket.io server ────────────────────────────
const httpServer = createServer(app);
initSocket(httpServer, allowedOrigins);

// ── Start ──────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n  🚀 Sociogram API running at http://localhost:${PORT}`);
  console.log(`  📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`  ⚡ Socket.io enabled`);
  console.log(`  🌐 CORS origins: ${allowedOrigins.join(', ')}\n`);
});
