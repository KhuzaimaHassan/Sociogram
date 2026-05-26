import prisma from '../utils/prisma.js';

// POST /api/posts/:id/react
export async function addReaction(req, res, next) {
  try {
    const { emoji, source = 'manual' } = req.body;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const validSources = ['expression', 'manual'];
    if (!validSources.includes(source)) {
      return res.status(400).json({ error: 'Source must be "expression" or "manual"' });
    }

    // Upsert — one reaction per user per post
    const reaction = await prisma.reaction.upsert({
      where: {
        userId_postId: { userId: req.user.id, postId: req.params.id },
      },
      update: { emoji, source },
      create: {
        emoji,
        source,
        userId: req.user.id,
        postId: req.params.id,
      },
    });

    // Get updated reaction counts
    const reactions = await prisma.reaction.findMany({
      where: { postId: req.params.id },
      select: { emoji: true },
    });

    const reactionCounts = {};
    reactions.forEach(r => {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
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
    await prisma.reaction.deleteMany({
      where: { userId: req.user.id, postId: req.params.id },
    });

    // Get updated reaction counts
    const reactions = await prisma.reaction.findMany({
      where: { postId: req.params.id },
      select: { emoji: true },
    });

    const reactionCounts = {};
    reactions.forEach(r => {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
    });

    res.json({ reactions: reactionCounts, myReaction: null });
  } catch (err) {
    next(err);
  }
}
