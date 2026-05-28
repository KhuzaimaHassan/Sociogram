import prisma from '../utils/prisma.js';
import { notifyUser, broadcastToPost } from '../socket.js';

// POST /api/posts/:id/react
export async function addReaction(req, res, next) {
  try {
    const { emoji, source = 'manual' } = req.body;
    const postId = req.params.id;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const validSources = ['expression', 'manual'];
    if (!validSources.includes(source)) {
      return res.status(400).json({ error: 'Source must be "expression" or "manual"' });
    }

    // Get post to find the author (before upsert for notification)
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    // Upsert — one reaction per user per post
    const reaction = await prisma.reaction.upsert({
      where: {
        userId_postId: { userId: req.user.id, postId },
      },
      update: { emoji, source },
      create: {
        emoji,
        source,
        userId: req.user.id,
        postId,
      },
    });

    // Get updated reaction counts
    const reactions = await prisma.reaction.findMany({
      where: { postId },
      select: { emoji: true },
    });

    const reactionCounts = {};
    reactions.forEach(r => {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
    });

    // 🔔 Notify post author (only for non-self reactions)
    if (post && post.userId !== req.user.id) {
      const sourceLabel = source === 'expression' ? '😊 expression' : 'manual';
      notifyUser(post.userId, 'notification', {
        id: `reaction-${postId}-${req.user.id}-${Date.now()}`,
        type: 'reaction',
        from: {
          id: req.user.id,
          username: req.user.username,
          avatar: req.user.avatar,
        },
        postId,
        emoji,
        source,
        message: `${req.user.username} reacted ${emoji} to your post`,
        timestamp: new Date().toISOString(),
      });
    }

    // 📡 Broadcast live reaction counts to all watchers of this post
    broadcastToPost(postId, 'post:reaction_update', {
      postId,
      reactions: reactionCounts,
      from: {
        id: req.user.id,
        username: req.user.username,
        emoji,
        source,
      },
    });

    res.json({
      reaction,
      reactions: reactionCounts,
      myReaction: emoji,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/posts/:id/react
export async function removeReaction(req, res, next) {
  try {
    const postId = req.params.id;

    await prisma.reaction.deleteMany({
      where: { userId: req.user.id, postId },
    });

    // Get updated reaction counts
    const reactions = await prisma.reaction.findMany({
      where: { postId },
      select: { emoji: true },
    });

    const reactionCounts = {};
    reactions.forEach(r => {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
    });

    // 📡 Broadcast cleared reaction
    broadcastToPost(postId, 'post:reaction_update', {
      postId,
      reactions: reactionCounts,
      from: { id: req.user.id, username: req.user.username, emoji: null },
    });

    res.json({ reactions: reactionCounts, myReaction: null });
  } catch (err) {
    next(err);
  }
}
