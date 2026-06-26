import { NavLink, useLocation } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';

const navItems = [
  {
    to: '/',
    label: 'Home',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? '0' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        {!active && <polyline points="9 22 9 12 15 12 15 22" />}
      </svg>
    ),
  },
  {
    to: '/explore',
    label: 'Explore',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? '2.2' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    to: '/create',
    label: 'Create',
    isPrimary: true,
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  },
  {
    to: '/messages',
    label: 'Messages',
    isMessages: true,
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? '0' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? '0' : '1.8'} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const location = useLocation();
  const { notifications } = useSocket();

  // Count unread DM notifications
  const dmUnread = notifications.filter((n) => n.type === 'message').length;

  if (location.pathname === '/reels' || location.pathname === '/create') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-elevated border-t border-dark-border/30">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = item.to === '/messages'
            ? location.pathname.startsWith('/messages')
            : location.pathname === item.to;

          if (item.isPrimary) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-accent-pink text-white shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 transition-all duration-200 active:scale-95"
                id={`nav-${item.label.toLowerCase()}`}
              >
                {item.icon(isActive)}
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                isActive ? 'text-brand-400' : 'text-surface-400 hover:text-white/70'
              }`}
              id={`nav-${item.label.toLowerCase()}`}
            >
              {item.icon(isActive)}

              {/* DM unread badge */}
              {item.isMessages && dmUnread > 0 && (
                <span className="absolute -top-1 right-1 min-w-[16px] h-4 px-1 bg-brand-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white leading-none">
                  {dmUnread > 9 ? '9+' : dmUnread}
                </span>
              )}

              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-0 w-6 h-0.5 bg-brand-500 rounded-full" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
