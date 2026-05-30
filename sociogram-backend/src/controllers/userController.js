import prisma from '../utils/prisma.js';
import { notifyUser } from '../socket.js';

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

    // 🔔 Notify the followed user
    notifyUser(req.params.id, 'notification', {
      id: `follow-${req.user.id}-${Date.now()}`,
      type: 'follow',
      from: {
        id: req.user.id,
        username: req.user.username,
        avatar: req.user.avatar,
      },
      message: `${req.user.username} started following you`,
      timestamp: new Date().toISOString(),
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

    const insensitive = process.env.DATABASE_PROVIDER === 'postgresql'
      ? { mode: 'insensitive' }
      : {};

    const myId = req.user.id;

    const users = await prisma.user.findMany({
      where: {
        id: { not: myId },
        OR: [
          { username: { contains: q, ...insensitive } },
          { displayName: { contains: q, ...insensitive } },
        ],
      },
      select: {
        id: true, username: true, displayName: true, avatar: true,
        _count: { select: { followers: true, posts: true } },
        followers: { where: { followerId: myId }, select: { id: true } },
      },
      take: 20,
    });

    res.json(users.map((u) => ({
      ...u,
      isFollowing: u.followers.length > 0,
      followers: undefined,
    })));
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:id/followers
export async function getFollowers(req, res, next) {
  try {
    const myId = req.user?.id;
    const follows = await prisma.follow.findMany({
      where: { followingId: req.params.id },
      include: {
        follower: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Attach isFollowing for each listed user
    let followingSet = new Set();
    if (myId) {
      const myFollows = await prisma.follow.findMany({
        where: { followerId: myId, followingId: { in: follows.map(f => f.follower.id) } },
        select: { followingId: true },
      });
      followingSet = new Set(myFollows.map(f => f.followingId));
    }

    res.json(follows.map((f) => ({
      ...f.follower,
      isFollowing: followingSet.has(f.follower.id),
    })));
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:id/following
export async function getFollowing(req, res, next) {
  try {
    const myId = req.user?.id;
    const follows = await prisma.follow.findMany({
      where: { followerId: req.params.id },
      include: {
        following: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    let followingSet = new Set();
    if (myId) {
      const myFollows = await prisma.follow.findMany({
        where: { followerId: myId, followingId: { in: follows.map(f => f.following.id) } },
        select: { followingId: true },
      });
      followingSet = new Set(myFollows.map(f => f.followingId));
    }

    res.json(follows.map((f) => ({
      ...f.following,
      isFollowing: followingSet.has(f.following.id),
    })));
  } catch (err) {
    next(err);
  }
}

// GET /api/users/suggested — people I don't follow yet
export async function getSuggested(req, res, next) {
  try {
    const myId = req.user.id;

    const alreadyFollowing = await prisma.follow.findMany({
      where: { followerId: myId },
      select: { followingId: true },
    });
    const excludeIds = [myId, ...alreadyFollowing.map(f => f.followingId)];

    const users = await prisma.user.findMany({
      where: { id: { notIn: excludeIds } },
      select: {
        id: true, username: true, displayName: true, avatar: true, bio: true,
        _count: { select: { followers: true, posts: true } },
      },
      orderBy: { followers: { _count: 'desc' } },
      take: 8,
    });

    res.json(users.map((u) => ({ ...u, isFollowing: false })));
  } catch (err) {
    next(err);
  }
}
