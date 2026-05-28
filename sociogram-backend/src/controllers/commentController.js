import prisma from '../utils/prisma.js';
import { notifyUser, broadcastToPost } from '../socket.js';

// POST /api/posts/:id/comments
export async function addComment(req, res, next) {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const postId = req.params.id;

    // Get post to find the author
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    const comment = await prisma.comment.create({
      data: {
        text: text.trim(),
        userId: req.user.id,
        postId,
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    });

    const commentCount = await prisma.comment.count({ where: { postId } });

    // 🔔 Notify post author
    if (post && post.userId !== req.user.id) {
      notifyUser(post.userId, 'notification', {
        id: `comment-${comment.id}`,
        type: 'comment',
        from: {
          id: req.user.id,
          username: req.user.username,
          avatar: req.user.avatar,
        },
        postId,
        commentId: comment.id,
        message: `${req.user.username} commented: "${text.trim().slice(0, 50)}${text.length > 50 ? '…' : ''}"`,
        timestamp: new Date().toISOString(),
      });
    }

    // 📡 Broadcast new comment + updated count to watchers
    broadcastToPost(postId, 'post:new_comment', {
      postId,
      comment,
      commentCount,
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
      select: { userId: true, postId: true },
    });

    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    await prisma.comment.delete({ where: { id: req.params.id } });

    const commentCount = await prisma.comment.count({ where: { postId: comment.postId } });

    // 📡 Broadcast updated comment count
    broadcastToPost(comment.postId, 'post:comment_deleted', {
      postId: comment.postId,
      commentId: req.params.id,
      commentCount,
    });

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    next(err);
  }
}
