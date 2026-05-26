import { Link, useLocation } from 'react-router-dom';
import { useExpression } from '../../context/ExpressionContext';

export default function TopNav() {
  const { isCameraActive } = useExpression();
  const location = useLocation();

  // Hide on reels page
  if (location.pathname === '/reels') return null;

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
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button className="action-btn" id="nav-notifications" title="Notifications">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {/* Notification dot */}
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent-rose rounded-full" />
          </button>
          <button className="action-btn" id="nav-messages" title="Messages">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
