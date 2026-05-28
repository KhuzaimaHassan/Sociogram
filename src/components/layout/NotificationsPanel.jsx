/**
 * NotificationsPanel — Real-time notification dropdown for TopNav.
 *
 * Shows notifications for: likes, comments, reactions, new followers.
 * Animated slide-in panel with emoji avatars, relative timestamps.
 */

import { useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';

const TYPE_CONFIG = {
  like:     { icon: '❤️',  color: 'text-red-400',    label: 'liked your post' },
  comment:  { icon: '💬',  color: 'text-blue-400',   label: 'commented' },
  reaction: { icon: '😍',  color: 'text-amber-400',  label: 'reacted' },
  follow:   { icon: '👥',  color: 'text-brand-400',  label: 'followed you' },
};

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function NotificationsPanel({ onClose }) {
  const { notifications, clearNotifications, removeNotification } = useSocket();
  const panelRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  function handleNotifClick(notif) {
    if (notif.postId) {
      // Navigate to home and highlight the post (future: deep link to post)
      navigate('/');
    }
    removeNotification(notif.id);
    onClose();
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl shadow-2xl shadow-black/50 border border-dark-border/50 z-50 animate-slide-down"
      style={{
        background: 'linear-gradient(135deg, rgba(18,18,28,0.98) 0%, rgba(14,14,22,0.98) 100%)',
        backdropFilter: 'blur(24px)',
      }}
      id="notifications-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border/30 sticky top-0"
        style={{ background: 'inherit' }}
      >
        <span className="text-sm font-semibold text-white">Notifications</span>
        {notifications.length > 0 && (
          <button
            onClick={clearNotifications}
            className="text-xs text-surface-400 hover:text-white transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Empty state */}
      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center px-4">
          <span className="text-4xl mb-3">🔔</span>
          <p className="text-sm font-medium text-white">No notifications yet</p>
          <p className="text-xs text-surface-400 mt-1">
            Likes, comments & reactions will appear here in real time
          </p>
        </div>
      )}

      {/* Notification list */}
      <div className="divide-y divide-dark-border/20">
        {notifications.map((notif) => {
          const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.like;
          const emoji = notif.type === 'reaction' ? notif.emoji : cfg.icon;

          return (
            <button
              key={notif.id}
              onClick={() => handleNotifClick(notif)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left group"
            >
              {/* Avatar + emoji badge */}
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-600/40 to-accent-pink/40 flex items-center justify-center text-base border border-white/10">
                  {notif.from?.avatar || '😎'}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 text-sm leading-none">
                  {emoji}
                </span>
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white leading-snug">
                  <span className="font-semibold">{notif.from?.username}</span>{' '}
                  <span className="text-surface-300">{notif.message?.replace(`${notif.from?.username} `, '')}</span>
                </p>
                <p className="text-xs text-surface-500 mt-0.5">{timeAgo(notif.timestamp)}</p>
              </div>

              {/* Dismiss */}
              <button
                onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }}
                className="shrink-0 text-surface-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs"
              >
                ✕
              </button>
            </button>
          );
        })}
      </div>
    </div>
  );
}
