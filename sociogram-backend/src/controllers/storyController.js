import prisma from '../utils/prisma.js';
import { notifyUser } from '../socket.js';

const STORY_TTL_HOURS = 24;

// ── GET /api/stories — stories from followed users + own ─────
export async function getStories(req, res, next) {
  try {
    const myId = req.user.id;
    const now = new Date();

    // Get IDs of people I follow
    const followingIds = await prisma.follow
      .findMany({ where: { followerId: myId }, select: { followingId: true } })
      .then((rows) => rows.map((r) => r.followingId));

    // Include own stories
    const userIds = [...new Set([myId, ...followingIds])];

    // Active stories (not expired), grouped by user
    const stories = await prisma.story.findMany({
      where: {
        userId: { in: userIds },
        expiresAt: { gt: now },
      },
      include: {
        user: { select: { id: true, username: true, avatar: true, displayName: true } },
        views: { where: { viewerId: myId }, select: { viewedAt: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by user, mark unread
    const grouped = {};
    for (const s of stories) {
      const uid = s.user.id;
      if (!grouped[uid]) {
        grouped[uid] = {
          user: s.user,
          stories: [],
          hasUnread: false,
          isOwn: uid === myId,
        };
      }
      const seen = s.views.length > 0;
      grouped[uid].stories.push({
        id: s.id,
        mediaUrl: s.mediaUrl,
        mediaType: s.mediaType,
        caption: s.caption,
        duration: s.duration,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        seen,
      });
      if (!seen) grouped[uid].hasUnread = true;
    }

    // Sort: own first, then unread first, then by latest story
    const result = Object.values(grouped).sort((a, b) => {
      if (a.isOwn) return -1;
      if (b.isOwn) return 1;
      if (a.hasUnread !== b.hasUnread) return a.hasUnread ? -1 : 1;
      const aLatest = a.stories[a.stories.length - 1].createdAt;
      const bLatest = b.stories[b.stories.length - 1].createdAt;
      return new Date(bLatest) - new Date(aLatest);
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/stories — create a story ───────────────────────
export async function createStory(req, res, next) {
  try {
    const myId = req.user.id;
    const { caption } = req.body;

    if (!req.file) return res.status(400).json({ error: 'Media file is required for a story' });

    const mediaType = req.file.mimetype?.startsWith('video/') ? 'video' : 'image';
    const mediaUrl = req.file.path?.startsWith('http')
      ? req.file.path
      : `/uploads/${req.file.filename}`;

    const expiresAt = new Date(Date.now() + STORY_TTL_HOURS * 60 * 60 * 1000);

    const story = await prisma.story.create({
      data: {
        mediaUrl,
        mediaType,
        caption: caption?.trim() || null,
        duration: mediaType === 'video' ? 15 : 5,
        expiresAt,
        userId: myId,
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    });

    // Notify followers about new story
    const followers = await prisma.follow.findMany({
      where: { followingId: myId },
      select: { followerId: true },
    });

    followers.forEach(({ followerId }) => {
      notifyUser(followerId, 'notification', {
        id: `story-${story.id}`,
        type: 'story',
        from: { id: myId, username: req.user.username, avatar: req.user.avatar },
        storyId: story.id,
        message: `${req.user.username} added a new story`,
        timestamp: story.createdAt.toISOString(),
      });
    });

    res.status(201).json(story);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/stories/:id/view — mark story as viewed ────────
export async function viewStory(req, res, next) {
  try {
    const myId = req.user.id;
    const { id: storyId } = req.params;

    await prisma.storyView.upsert({
      where: { storyId_viewerId: { storyId, viewerId: myId } },
      create: { storyId, viewerId: myId },
      update: { viewedAt: new Date() },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/stories/:id — delete own story ────────────────
export async function deleteStory(req, res, next) {
  try {
    const myId = req.user.id;
    const { id: storyId } = req.params;

    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) return res.status(404).json({ error: 'Story not found' });
    if (story.userId !== myId) return res.status(403).json({ error: 'Not authorized' });

    await prisma.story.delete({ where: { id: storyId } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
