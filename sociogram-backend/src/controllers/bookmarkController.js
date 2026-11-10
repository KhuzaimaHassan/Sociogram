import prisma from '../utils/prisma.js';

// A saved collection belongs only to the authenticated user. If an author's
// account becomes private, keep its posts hidden unless this user follows it.
function visiblePost(userId) {
  return { OR: [
    { userId },
    { user: { isPrivate: false } },
    { user: { followers: { some: { followerId: userId } } } },
  ] };
}

function readCursor(value, owner) {
  if (typeof value !== 'string' || value.length > 1024 || !/^[\w-]+$/.test(value)) throw new Error('Invalid cursor');
  const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  const date = new Date(cursor.at);
  if (cursor.owner !== owner || typeof cursor.id !== 'string' || !cursor.id || cursor.id.length > 128 ||
      !Number.isFinite(date.getTime()) || date.toISOString() !== cursor.at) throw new Error('Invalid cursor');
  return { id: cursor.id, date };
}

export async function getSavedPosts(req, res, next) {
  try {
    const limit = Number(req.query.limit ?? 20);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      return res.status(400).json({ error: 'Invalid saved-post pagination' });
    }
    let cursor;
    if (req.query.cursor !== undefined) {
      try { cursor = readCursor(req.query.cursor, req.user.id); }
      catch { return res.status(400).json({ error: 'Invalid saved-post cursor' }); }
    }
    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId: req.user.id, post: visiblePost(req.user.id),
        ...(cursor ? { OR: [{ createdAt: { lt: cursor.date } }, { createdAt: cursor.date, id: { lt: cursor.id } }] } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: { post: { select: {
        id: true, caption: true, mediaUrl: true, mediaType: true, isReel: true,
        createdAt: true, location: true,
        user: { select: { id: true, username: true, avatar: true } },
      } } },
    });
    const page = bookmarks.slice(0, limit);
    const last = page[page.length - 1];
    res.json({
      posts: page.map(bookmark => ({ ...bookmark.post, saved: true })),
      nextCursor: bookmarks.length > limit
        ? Buffer.from(JSON.stringify({ owner: req.user.id, id: last.id, at: last.createdAt.toISOString() })).toString('base64url')
        : null,
    });
  } catch (error) { next(error); }
}

export async function savePost(req, res, next) {
  try {
    const post = await prisma.post.findFirst({
      where: { id: req.params.id, ...visiblePost(req.user.id) }, select: { id: true },
    });
    if (!post) return res.status(404).json({ error: 'Post not found or unavailable' });
    await prisma.bookmark.upsert({
      where: { userId_postId: { userId: req.user.id, postId: post.id } },
      create: { userId: req.user.id, postId: post.id }, update: {},
    });
    res.json({ saved: true });
  } catch (error) {
    // Concurrent saves are idempotent. A post can also disappear between the
    // visibility check and insertion; its foreign key must not leave a bookmark.
    if (error.code === 'P2002') return res.json({ saved: true });
    if (error.code === 'P2003') return res.status(404).json({ error: 'Post not found or unavailable' });
    next(error);
  }
}

export async function unsavePost(req, res, next) {
  try {
    await prisma.bookmark.deleteMany({ where: { userId: req.user.id, postId: req.params.id } });
    res.json({ saved: false });
  } catch (error) { next(error); }
}
