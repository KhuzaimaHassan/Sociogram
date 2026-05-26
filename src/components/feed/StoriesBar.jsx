import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../shared/Avatar';
import * as userApi from '../../services/userService';

// Fallback users shown if API is unavailable
const FALLBACK_USERS = [
  { id: 'f1', username: 'alex.wanderer', displayName: 'Alex', avatar: '🧗' },
  { id: 'f2', username: 'chef.maya', displayName: 'Maya', avatar: '👩‍🍳' },
  { id: 'f3', username: 'pixel.artist', displayName: 'Pixel', avatar: '🎨' },
  { id: 'f4', username: 'ocean.diver', displayName: 'Diver', avatar: '🤿' },
  { id: 'f5', username: 'astro.nerd', displayName: 'Astro', avatar: '🔭' },
];

export default function StoriesBar() {
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadUsers() {
      try {
        // Search with common letters to get a broad result set
        const results = await userApi.searchUsers('a');
        if (!cancelled) {
          // Filter out current user
          const others = (results || []).filter((u) => u.id !== me?.id).slice(0, 10);
          setUsers(others.length > 0 ? others : FALLBACK_USERS);
        }
      } catch {
        if (!cancelled) setUsers(FALLBACK_USERS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadUsers();
    return () => { cancelled = true; };
  }, [me?.id]);

  const displayUsers = loading ? [] : users;

  return (
    <div className="glass-elevated border-b border-dark-border/30 py-3">
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4">
        {/* Own avatar / Add Story */}
        <button
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center gap-1 min-w-[68px] group"
          id="stories-own"
        >
          <div className="relative">
            <Avatar
              emoji={me?.avatar || '😎'}
              size="lg"
              hasStory={false}
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center border-2 border-dark-bg group-hover:bg-brand-400 transition-colors">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
          </div>
          <span className="text-[11px] text-white/60 truncate w-16 text-center">Your Story</span>
        </button>

        {/* Loading skeletons */}
        {loading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 min-w-[68px]">
            <div className="w-14 h-14 rounded-full bg-dark-elevated/60 animate-pulse" />
            <div className="w-10 h-2 rounded bg-dark-elevated/60 animate-pulse" />
          </div>
        ))}

        {/* Real users */}
        {displayUsers.map((u) => (
          <button
            key={u.id}
            onClick={() => navigate(`/profile/${u.username}`)}
            className="flex flex-col items-center gap-1 min-w-[68px] group"
          >
            <div className="relative">
              {/* Gradient ring — indicates "active" */}
              <div className="story-ring p-[2.5px] rounded-full">
                <div className="bg-dark-bg rounded-full p-0.5">
                  <Avatar emoji={u.avatar || '😎'} size="lg" hasStory={false} />
                </div>
              </div>
            </div>
            <span className="text-[11px] text-white/60 truncate w-16 text-center group-hover:text-white/90 transition-colors">
              {u.username.split('.')[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
