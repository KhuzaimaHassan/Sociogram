import prisma from '../utils/prisma.js';
import { notifyUser, broadcastToPost } from '../socket.js';
import { deleteMediaFile } from '../middleware/upload.js';

// POST /api/posts
export async function createPost(req, res, next) {
  try {
    const { caption, isReel, location } = req.body;
    let mediaUrl = null;
    let mediaType = 'image';

    if (req.file) {
      mediaType = req.file.mimetype?.startsWith('video/') ? 'video' : 'image';

      if (req.file.path && req.file.path.startsWith('http')) {
        // Cloudinary upload — multer-storage-cloudinary sets req.file.path to the CDN URL
        mediaUrl = req.file.path;
      } else {
        // Local disk upload
        mediaUrl = `/uploads/${req.file.filename}`;
      }
    }

    const post = await prisma.post.create({
      data: {
        caption,
        mediaUrl,
        mediaType,
        isReel: isReel === 'true' || isReel === true,
        location,
        userId: req.user.id,
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        _count: { select: { likes: true, comments: true, reactions: true } },
      },
    });

    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
}

// GET /api/posts/feed
export async function getFeed(req, res, next) {
  try {
    const { cursor, limit = 10 } = req.query;
    const take = Math.min(parseInt(limit), 50);

    // Get IDs of users that the current user follows
    const follows = await prisma.follow.findMany({
      where: { followerId: req.user.id },
      select: { followingId: true },
    });
    const followingIds = follows.map(f => f.followingId);
    // Include own posts in feed
    followingIds.push(req.user.id);

    const where = {
      userId: { in: followingIds },
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    };

    const posts = await prisma.post.findMany({
      where,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, avatar: true, displayName: true } },
        _count: { select: { likes: true, comments: true } },
        reactions: {
          select: { emoji: true, userId: true },
        },
        likes: {
          where: { userId: req.user.id },
          select: { id: true },
          take: 1,
        },
      },
    });

    // Transform to include computed fields
    const transformed = posts.map(post => {
      const reactionCounts = {};
      let myReaction = null;
      post.reactions.forEach(r => {
        reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
        if (r.userId === req.user.id) myReaction = r.emoji;
      });

      return {
        id: post.id,
        caption: post.caption,
        mediaUrl: post.mediaUrl,
        mediaType: post.mediaType,
        isReel: post.isReel,
        location: post.location,
        createdAt: post.createdAt,
        user: post.user,
        likes: post._count.likes,
        comments: post._count.comments,
        reactions: reactionCounts,
        liked: post.likes.length > 0,
        myReaction,
      };
    });

    const nextCursor = posts.length === take
      ? posts[posts.length - 1].createdAt.toISOString()
      : null;

    res.json({ posts: transformed, nextCursor });
  } catch (err) {
    next(err);
  }
}

// GET /api/posts/explore
export async function getExplore(req, res, next) {
  try {
    const { cursor, limit = 20 } = req.query;
    const take = Math.min(parseInt(limit), 50);

    const posts = await prisma.post.findMany({
      where: { user: { isPrivate: false } },
      take,
      orderBy: { createdAt: 'desc' },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    const nextCursor = posts.length === take ? posts[posts.length - 1].id : null;

    res.json({ posts, nextCursor });
  } catch (err) {
    next(err);
  }
}

// GET /api/posts/:id
export async function getPost(req, res, next) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, username: true, avatar: true, displayName: true, isPrivate: true } },
        _count: { select: { likes: true, comments: true } },
        reactions: { select: { emoji: true, userId: true, source: true } },
        comments: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, username: true, avatar: true } } },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.user.isPrivate && post.user.id !== req.user.id) {
      const isFollowing = await prisma.follow.findFirst({
        where: { followerId: req.user.id, followingId: post.user.id },
      });
      if (!isFollowing) return res.status(403).json({ error: 'This account is private' });
    }

    res.json(post);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/posts/:id
export async function deletePost(req, res, next) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      select: { userId: true, mediaUrl: true, mediaType: true },
    });

    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    // Delete media file from Cloudinary/Local
    if (post.mediaUrl) {
      await deleteMediaFile(post.mediaUrl, post.mediaType);
    }

    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ message: 'Post deleted' });
  } catch (err) {
    next(err);
  }
}

// POST /api/posts/:id/like
export async function likePost(req, res, next) {
  try {
    const postId = req.params.id;

    // Get post to find the author
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    await prisma.like.create({
      data: { userId: req.user.id, postId },
    });

    const count = await prisma.like.count({ where: { postId } });

    // 🔔 Notify post author (not yourself)
    if (post && post.userId !== req.user.id) {
      notifyUser(post.userId, 'notification', {
        id: `like-${postId}-${req.user.id}-${Date.now()}`,
        type: 'like',
        from: {
          id: req.user.id,
          username: req.user.username,
          avatar: req.user.avatar,
        },
        postId,
        message: `${req.user.username} liked your post`,
        timestamp: new Date().toISOString(),
      });
    }

    // 📡 Broadcast live like count to everyone watching this post
    broadcastToPost(postId, 'post:like_update', { postId, likes: count });

    res.json({ liked: true, likes: count });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Already liked' });
    }
    next(err);
  }
}

// DELETE /api/posts/:id/like
export async function unlikePost(req, res, next) {
  try {
    const postId = req.params.id;

    await prisma.like.deleteMany({
      where: { userId: req.user.id, postId },
    });

    const count = await prisma.like.count({ where: { postId } });

    // 📡 Broadcast updated count
    broadcastToPost(postId, 'post:like_update', { postId, likes: count });

    res.json({ liked: false, likes: count });
  } catch (err) {
    next(err);
  }
}
