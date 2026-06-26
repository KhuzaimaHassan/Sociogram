import bcrypt from 'bcrypt';
import prisma from '../utils/prisma.js';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt.js';
import { deleteMediaFile } from '../middleware/upload.js';
import { sendEmail } from '../utils/emailService.js';
import crypto from 'crypto';

// POST /api/auth/register
export async function register(req, res, next) {
  try {
    const { username, email, password, displayName } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 3-30 characters' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!/^[a-zA-Z0-9._]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, dots, and underscores' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password: hashedPassword,
        displayName: displayName || username,
      },
      select: { id: true, username: true, email: true, displayName: true, avatar: true },
    });

    const tokens = generateTokenPair(user.id);

    res.status(201).json({ user, ...tokens });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const tokens = generateTokenPair(user.id);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
      },
      ...tokens,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/refresh
export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const tokens = generateTokenPair(user.id);
    res.json(tokens);
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    next(err);
  }
}

// GET /api/auth/me
export async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, username: true, email: true, displayName: true,
        avatar: true, bio: true, createdAt: true,
        _count: { select: { posts: true, followers: true, following: true } },
      },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/change-password
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashed },
    });

    res.json({ ok: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/auth/account
export async function deleteAccount(req, res, next) {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        posts: { select: { mediaUrl: true, mediaType: true } },
        stories: { select: { mediaUrl: true, mediaType: true } },
      }
    });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Password is incorrect' });
    }

    // Delete all media files associated with the user
    const mediaToDelete = [];
    if (user.avatar && user.avatar.startsWith('http') && !user.avatar.includes('api.dicebear.com')) {
      mediaToDelete.push({ url: user.avatar, type: 'image' });
    }
    user.posts.forEach(p => {
      if (p.mediaUrl) mediaToDelete.push({ url: p.mediaUrl, type: p.mediaType });
    });
    user.stories.forEach(s => {
      if (s.mediaUrl) mediaToDelete.push({ url: s.mediaUrl, type: s.mediaType });
    });

    for (const media of mediaToDelete) {
      await deleteMediaFile(media.url, media.type);
    }

    // Cascade delete via Prisma (all posts, follows, messages, stories etc.)
    await prisma.user.delete({ where: { id: req.user.id } });

    res.json({ ok: true, message: 'Account deleted' });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/forgot-password
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return ok anyway to prevent email enumeration
      return res.json({ ok: true, message: 'If an account exists, a reset link has been sent' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // UPSERT reset token
    await prisma.resetToken.upsert({
      where: { userId: user.id },
      update: { token, expiresAt },
      create: { token, expiresAt, userId: user.id },
    });

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    
    await sendEmail({
      to: user.email,
      subject: 'Sociogram - Reset Your Password',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the link below to set a new password:</p>
        <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#3b82f6;color:white;text-decoration:none;border-radius:5px;">Reset Password</a>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
      `
    });

    res.json({ ok: true, message: 'If an account exists, a reset link has been sent' });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/reset-password
export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const resetRecord = await prisma.resetToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashed }
    });

    // Clean up token
    await prisma.resetToken.delete({ where: { id: resetRecord.id } });

    res.json({ ok: true, message: 'Password has been successfully reset' });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/verify-email
export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const verifyRecord = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verifyRecord || verifyRecord.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    await prisma.user.update({
      where: { id: verifyRecord.userId },
      data: { isVerified: true }
    });

    // Clean up
    await prisma.verificationToken.delete({ where: { id: verifyRecord.id } });

    res.json({ ok: true, message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/resend-verification
export async function resendVerification(req, res, next) {
  try {
    // Can be called with authenticated user or just email
    const email = req.user?.email || req.body.email;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json({ ok: true, message: 'If an account exists, a verification link has been sent' });
    if (user.isVerified) return res.status(400).json({ error: 'Email is already verified' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.upsert({
      where: { userId: user.id },
      update: { token, expiresAt },
      create: { token, expiresAt, userId: user.id },
    });

    const verifyLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: 'Sociogram - Verify Your Email',
      html: `
        <h2>Welcome to Sociogram!</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verifyLink}" style="display:inline-block;padding:10px 20px;background:#10b981;color:white;text-decoration:none;border-radius:5px;">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
      `
    });

    res.json({ ok: true, message: 'Verification email sent' });
  } catch (err) {
    next(err);
  }
}
