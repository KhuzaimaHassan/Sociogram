/**
 * SocketContext — manages the Socket.io connection for Sociogram.
 *
 * Features:
 *   - Auto-connects when user is authenticated, disconnects on logout
 *   - Joins the user's personal room for targeted notifications
 *   - Accumulates notifications with unread badge count
 *   - Exposes helpers: markAllRead, clearNotifications
 *   - Provides the raw socket for child components (e.g. watch:post)
 */

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../services/apiClient';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      setConnected(true);
      // Join personal notification room
      socket.emit('join', user.id);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] connection error:', err.message);
    });

    // 🔔 Incoming notification from any action (like, comment, reaction, follow)
    socket.on('notification', (data) => {
      setNotifications((prev) => {
        // Deduplicate by id
        const exists = prev.some((n) => n.id === data.id);
        if (exists) return prev;
        return [data, ...prev.slice(0, 49)]; // keep max 50
      });
      setUnreadCount((c) => c + 1);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated, user?.id]);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        connected,
        notifications,
        unreadCount,
        markAllRead,
        clearNotifications,
        removeNotification,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside <SocketProvider>');
  return ctx;
}
