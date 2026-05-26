import prisma from '../utils/prisma.js';

// GET /api/users/:username
export async function getProfile(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: {
        id: true, username: true, displayName: true, avatar: true, bio: true, createdAt: true,
        _count: { select: { posts: true, followers: true, following: true } },
        posts: {
          take: 30,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, mediaUrl: true, mediaType: true, isReel: true, createdAt: true,
            _count: { select: { likes: true, comments: true } },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if current user follows this profile
    let isFollowing = false;
    if (req.user) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: req.user.id,
            followingId: user.id,
          },
        },
      });
      isFollowing = !!follow;
    }

    res.json({ ...user, isFollowing });
  } catch (err) {
    next(err);
  }
}

// PUT /api/users/me
export async function updateProfile(req, res, next) {
  try {
    const { displayName, bio, avatar } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(avatar !== undefined && { avatar }),
      },
      select: {
        id: true, username: true, email: true, displayName: true, avatar: true, bio: true,
      },
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
}

// POST /api/users/:id/follow
export async function followUser(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    await prisma.follow.create({
      data: {
        followerId: req.user.id,
        followingId: req.params.id,
      },
    });

    res.json({ following: true });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Already following this user' });
    }
    next(err);
  }
}

// DELETE /api/users/:id/follow
export async function unfollowUser(req, res, next) {
  try {
    await prisma.follow.deleteMany({
      where: {
        followerId: req.user.id,
        followingId: req.params.id,
      },
    });

    res.json({ following: false });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/search?q=
export async function searchUsers(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    // NOTE: `mode: 'insensitive'` is Postgres-only. We strip it for portability
    // (SQLite uses ASCII-insensitive LIKE by default, which is fine for usernames).
    const insensitive = process.env.DATABASE_PROVIDER === 'postgresql'
      ? { mode: 'insensitive' }
      : {};

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, ...insensitive } },
          { displayName: { contains: q, ...insensitive } },
        ],
      },
      select: { id: true, username: true, displayName: true, avatar: true },
      take: 20,
    });

    res.json(users);
  } catch (err) {
    next(err);
  }
}
