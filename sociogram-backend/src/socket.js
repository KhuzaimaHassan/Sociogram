/**
 * socket.js — Singleton Socket.io instance for Sociogram backend.
 *
 * Usage:
 *   import { initSocket, notifyUser } from './socket.js';
 *
 * Architecture:
 *   - Each authenticated user joins room `user:{userId}` on connect
 *   - Controllers call notifyUser() to push real-time events to specific users
 *   - Public events (post reactions) are broadcast to all connected clients
 */

import { Server } from 'socket.io';

let io = null;

/**
 * Initialize Socket.io — called once from server.js on startup.
 * @param {import('http').Server} httpServer
 * @param {string[]} allowedOrigins
 * @returns {Server} the io instance
 */
export function initSocket(httpServer, allowedOrigins) {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Prefer WebSocket, fall back to polling (Render free tier supports both)
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    // Client sends 'join' with their userId right after connecting
    socket.on('join', (userId) => {
      if (userId && typeof userId === 'string') {
        socket.join(`user:${userId}`);
        socket.userId = userId;
      }
    });

    // Client can join a post room to receive live reaction/comment updates
    socket.on('watch:post', (postId) => {
      if (postId) socket.join(`post:${postId}`);
    });

    socket.on('unwatch:post', (postId) => {
      if (postId) socket.leave(`post:${postId}`);
    });

    socket.on('disconnect', () => {
      // rooms are automatically cleaned up by socket.io
    });
  });

  console.log('  ⚡ Socket.io initialized');
  return io;
}

/** Get the io instance (null until initSocket is called). */
export function getIO() {
  return io;
}

/**
 * Send a notification to a specific user's personal room.
 * Safe to call even if io is not yet initialized (no-op).
 */
export function notifyUser(userId, event, data) {
  if (io && userId) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

/**
 * Broadcast a public event to all clients watching a specific post.
 * Used for live like/reaction/comment count updates.
 */
export function broadcastToPost(postId, event, data) {
  if (io && postId) {
    io.to(`post:${postId}`).emit(event, data);
  }
}

/**
 * Broadcast to ALL connected clients (e.g. trending updates).
 */
export function broadcast(event, data) {
  if (io) {
    io.emit(event, data);
  }
}
