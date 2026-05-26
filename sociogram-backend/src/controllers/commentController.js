import prisma from '../utils/prisma.js';

// POST /api/posts/:id/comments
export async function addComment(req, res, next) {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const comment = await prisma.comment.create({
      data: {
        text: text.trim(),
        userId: req.user.id,
        postId: req.params.id,
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    });

    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
}

// GET /api/posts/:id/comments
export async function getComments(req, res, next) {
  try {
    const { cursor, limit = 20 } = req.query;
    const take = Math.min(parseInt(limit), 50);

    const comments = await prisma.comment.findMany({
      where: { postId: req.params.id },
      take,
      orderBy: { createdAt: 'desc' },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    });

    const nextCursor = comments.length === take ? comments[comments.length - 1].id : null;

    res.json({ comments, nextCursor });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/comments/:id
export async function deleteComment(req, res, next) {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id },
      select: { userId: true },
    });

    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    await prisma.comment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    next(err);
  }
}
