import prisma from '../utils/prisma.js';

// GET /api/notifications
export async function getNotifications(req, res, next) {
  try {
    const { cursor, limit = 20 } = req.query;
    const take = Math.min(parseInt(limit), 50);

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      take,
      orderBy: { createdAt: 'desc' },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
      },
    });

    const nextCursor = notifications.length === take ? notifications[notifications.length - 1].id : null;
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, readAt: null },
    });

    res.json({ notifications, nextCursor, unreadCount });
  } catch (err) {
    next(err);
  }
}

// PUT /api/notifications/read
export async function markAsRead(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
