import { useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useExpression } from '../../context/ExpressionContext';
import { useSocket } from '../../context/SocketContext';
import NotificationsPanel from './NotificationsPanel';

export default function TopNav() {
  const { isCameraActive } = useExpression();
  const { unreadCount, markAllRead, connected } = useSocket();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);

  if (location.pathname === '/reels') return null;

  function handleBellClick() {
    if (!showNotifications) markAllRead();
    setShowNotifications((v) => !v);
  }

  const closeNotifications = useCallback(() => setShowNotifications(false), []);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass-elevated border-b border-dark-border/30">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2" id="nav-logo">
          <h1 className="text-xl font-bold gradient-text tracking-tight">
            Sociogram
          </h1>
          {/* Camera indicator */}
          {isCameraActive && (
            <span className="relative flex h-2.5 w-2.5" title="Camera active — detecting expressions">
              <span className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
          )}
          {/* Socket connected indicator (subtle) */}
          {connected && (
            <span
              className="relative flex h-1.5 w-1.5"
              title="Live — real-time updates active"
            >
              <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-400" />
            </span>
          )}
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* 🔔 Notifications bell */}
          <div className="relative">
            <button
              className="action-btn"
              id="nav-notifications"
              title="Notifications"
              onClick={handleBellClick}
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white/80"
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>

              {/* Unread badge */}
              {unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-accent-rose rounded-full flex items-center justify-center text-[10px] font-bold text-white leading-none animate-bounce-in">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent-rose rounded-full" />
              )}
            </button>

            {/* Notifications panel */}
            {showNotifications && (
              <NotificationsPanel onClose={closeNotifications} />
            )}
          </div>

          {/* 💬 Messages (placeholder — DMs coming soon) */}
          <button className="action-btn" id="nav-messages" title="Messages (coming soon)">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white/80"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
