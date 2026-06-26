import prisma from '../utils/prisma.js';
import { notifyUser, getIO } from '../socket.js';

// ── Helpers ─────────────────────────────────────────────

/** Sort two user IDs so (A,B) === (B,A) — prevents duplicate conversations. */
function sortedPair(idA, idB) {
  return idA < idB ? [idA, idB] : [idB, idA];
}

function formatConversation(conv, myId) {
  const other = conv.participantAId === myId ? conv.participantB : conv.participantA;
  const lastMsg = conv.messages?.[0] ?? null;
  const unread = conv.messages?.filter(
    (m) => m.senderId !== myId && !m.readAt
  ).length ?? 0;

  return {
    id: conv.id,
    other,
    lastMessage: lastMsg,
    unreadCount: unread,
    updatedAt: conv.updatedAt,
  };
}

// ── GET /api/conversations ─────────────────────────────
export async function getConversations(req, res, next) {
  try {
    const myId = req.user.id;

    const convs = await prisma.conversation.findMany({
      where: {
        OR: [{ participantAId: myId }, { participantBId: myId }],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        participantA: { select: { id: true, username: true, displayName: true, avatar: true } },
        participantB: { select: { id: true, username: true, displayName: true, avatar: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 30, // to count unread + get last
          select: { id: true, text: true, senderId: true, readAt: true, createdAt: true },
        },
      },
    });

    res.json(convs.map((c) => formatConversation(c, myId)));
  } catch (err) {
    next(err);
  }
}

// ── POST /api/conversations ────────────────────────────
// Start or find a conversation with another user.
export async function getOrCreateConversation(req, res, next) {
  try {
    const myId = req.user.id;
    const { userId: otherId } = req.body;

    if (!otherId) return res.status(400).json({ error: 'userId is required' });
    if (otherId === myId) return res.status(400).json({ error: 'Cannot message yourself' });

    const [aId, bId] = sortedPair(myId, otherId);

    // Upsert conversation
    let conv = await prisma.conversation.findUnique({
      where: { participantAId_participantBId: { participantAId: aId, participantBId: bId } },
      include: {
        participantA: { select: { id: true, username: true, displayName: true, avatar: true } },
        participantB: { select: { id: true, username: true, displayName: true, avatar: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, text: true, senderId: true, readAt: true, createdAt: true } },
      },
    });

    if (!conv) {
      conv = await prisma.conversation.create({
        data: { participantAId: aId, participantBId: bId },
        include: {
          participantA: { select: { id: true, username: true, displayName: true, avatar: true } },
          participantB: { select: { id: true, username: true, displayName: true, avatar: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, text: true, senderId: true, readAt: true, createdAt: true } },
        },
      });
    }

    res.json(formatConversation(conv, myId));
  } catch (err) {
    next(err);
  }
}

// ── GET /api/conversations/:id/messages ───────────────
export async function getMessages(req, res, next) {
  try {
    const myId = req.user.id;
    const { id: convId } = req.params;
    const { cursor, limit = 30 } = req.query;
    const take = Math.min(parseInt(limit), 100);

    // Verify user is in this conversation
    const conv = await prisma.conversation.findUnique({ where: { id: convId } });
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    if (conv.participantAId !== myId && conv.participantBId !== myId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId: convId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
      },
    });

    // Mark incoming messages as read
    await prisma.message.updateMany({
      where: { conversationId: convId, senderId: { not: myId }, readAt: null },
      data: { readAt: new Date() },
    });

    const nextCursor = messages.length === take
      ? messages[messages.length - 1].createdAt.toISOString()
      : null;

    res.json({ messages: messages.reverse(), nextCursor });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/conversations/:id/messages ──────────────
export async function sendMessage(req, res, next) {
  try {
    const myId = req.user.id;
    const { id: convId } = req.params;
    const { text } = req.body;

    if (!text?.trim()) return res.status(400).json({ error: 'Message text is required' });

    // Verify user is in this conversation
    const conv = await prisma.conversation.findUnique({
      where: { id: convId },
      select: { participantAId: true, participantBId: true },
    });
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    if (conv.participantAId !== myId && conv.participantBId !== myId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const otherId = conv.participantAId === myId ? conv.participantBId : conv.participantAId;

    const message = await prisma.message.create({
      data: { text: text.trim(), senderId: myId, conversationId: convId },
      include: { sender: { select: { id: true, username: true, avatar: true } } },
    });

    // Update conversation's updatedAt so it sorts to top
    await prisma.conversation.update({
      where: { id: convId },
      data: { updatedAt: new Date() },
    });

    // 📡 Real-time: emit to the conversation room (both participants)
    const io = getIO();
    if (io) {
      io.to(`conv:${convId}`).emit('message:new', {
        conversationId: convId,
        message,
      });
    }

    // 🔔 Push notification to the other user if they're not in the conversation room
    notifyUser(otherId, 'notification', {
      id: `dm-${message.id}`,
      type: 'message',
      from: { id: myId, username: req.user.username, avatar: req.user.avatar },
      conversationId: convId,
      message: `${req.user.username}: ${text.trim().slice(0, 50)}${text.length > 50 ? '…' : ''}`,
      timestamp: message.createdAt.toISOString(),
    });

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/conversations/unread-count ───────────────
export async function getUnreadCount(req, res, next) {
  try {
    const myId = req.user.id;

    const count = await prisma.message.count({
      where: {
        conversation: {
          OR: [{ participantAId: myId }, { participantBId: myId }],
        },
        senderId: { not: myId },
        readAt: null,
      },
    });

    res.json({ unread: count });
  } catch (err) {
    next(err);
  }
}

// ── PUT /api/conversations/:id/read ───────────────────
export async function markConversationAsRead(req, res, next) {
  try {
    const myId = req.user.id;
    const { id: convId } = req.params;

    // Verify conversation existence and membership
    const conv = await prisma.conversation.findUnique({
      where: { id: convId },
    });

    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    if (conv.participantAId !== myId && conv.participantBId !== myId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Mark messages sent to me in this conversation as read
    await prisma.message.updateMany({
      where: { conversationId: convId, senderId: { not: myId }, readAt: null },
      data: { readAt: new Date() },
    });

    // Fire socket event so other devices sync the read state
    const { notifyUser } = await import('../socket.js');
    notifyUser(myId, 'dm:read_update', { conversationId: convId });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
