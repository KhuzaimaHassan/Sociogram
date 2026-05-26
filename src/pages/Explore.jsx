import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as postApi from '../services/postService';
import * as userApi from '../services/userService';
import { mediaUrl } from '../services/apiClient';
import { formatCount } from '../utils/formatTime';
import Avatar from '../components/shared/Avatar';
import { posts as MOCK_POSTS } from '../data/mockPosts';
import { getPostVisual } from '../utils/postVisual';

// Mock user search data for demo mode
const MOCK_USERS = [
  { id: '1', username: 'alex.wanderer', displayName: 'Alex Wanderer', avatar: '🧗' },
  { id: '2', username: 'chef.maya', displayName: 'Chef Maya', avatar: '👩‍🍳' },
  { id: '3', username: 'pixel.artist', displayName: 'Pixel Artist', avatar: '🎨' },
  { id: '4', username: 'tech.sarah', displayName: 'Sarah Tech', avatar: '💻' },
  { id: '5', username: 'ocean.diver', displayName: 'Ocean Diver', avatar: '🤿' },
  { id: '6', username: 'fitness.mike', displayName: 'Mike Fit', avatar: '💪' },
  { id: '7', username: 'aurora.lens', displayName: 'Aurora Lens', avatar: '📸' },
  { id: '8', username: 'astro.nerd', displayName: 'Astro Nerd', avatar: '🔭' },
];

export default function Explore() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await postApi.getExplore({ limit: 30 });
      setPosts(data.posts || []);
    } catch {
      // Demo fallback — use mock posts
      await new Promise((r) => setTimeout(r, 300));
      setPosts(MOCK_POSTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const results = await userApi.searchUsers(q);
        if (!cancelled) setSearchResults(results || []);
      } catch {
        // Demo fallback — filter mock users
        if (!cancelled) {
          const filtered = MOCK_USERS.filter(
            (u) => u.username.includes(q.toLowerCase()) || u.displayName.toLowerCase().includes(q.toLowerCase())
          );
          setSearchResults(filtered);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchQuery]);

  return (
    <div className="feed-container">
      <div className="px-4 pt-2 pb-3">
        <div className="relative">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search creators by username…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
            id="explore-search"
          />
        </div>
      </div>

      {searchQuery.trim().length >= 2 ? (
        <div className="px-2 pb-20">
          {searching && (
            <div className="text-center py-8 text-xs text-surface-400">Searching…</div>
          )}
          {!searching && searchResults.length === 0 && (
            <div className="text-center py-8 text-xs text-surface-400">No users found.</div>
          )}
          {searchResults.map((u) => (
            <button
              key={u.id}
              onClick={() => navigate(`/profile/${u.username}`)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-colors text-left"
            >
              <Avatar emoji={u.avatar || '😎'} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{u.username}</p>
                {u.displayName && (
                  <p className="text-xs text-surface-400 truncate">{u.displayName}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="px-1 pb-20">
          {loading && (
            <div className="py-16 text-center">
              <div className="inline-block w-8 h-8 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
            </div>
          )}
          {error && (
            <div className="mx-4 my-3 px-4 py-3 rounded-xl bg-accent-rose/10 border border-accent-rose/30 flex items-center justify-between">
              <span className="text-xs text-accent-rose">Couldn't load: {error}</span>
              <button onClick={refresh} className="text-xs font-medium text-white/80">Retry</button>
            </div>
          )}
          {!loading && posts.length === 0 && !error && (
            <div className="py-16 text-center px-6">
              <div className="text-4xl mb-2">🌌</div>
              <p className="text-white font-semibold">Nothing to explore yet</p>
              <p className="text-xs text-surface-400 mt-1">Be the first to share something with the world.</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((post, idx) => {
              const isLarge = idx % 5 === 0;
              const url = mediaUrl(post.mediaUrl);
              return (
                <div
                  key={post.id}
                  className={`relative overflow-hidden group cursor-pointer aspect-square ${
                    isLarge ? 'col-span-2 row-span-2' : ''
                  }`}
                >
                  {url ? (
                    post.mediaType === 'video' ? (
                      <video src={url} className="w-full h-full object-cover bg-black" muted loop playsInline />
                    ) : (
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    )
                  ) : (() => {
                    const v = getPostVisual(post);
                    return (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: v.gradient }}>
                        <span className={`${isLarge ? 'text-6xl' : 'text-3xl'} select-none`}>{v.emoji}</span>
                      </div>
                    );
                  })()}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      {formatCount(post._count?.likes || 0)}
                    </div>
                    <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      {post._count?.comments || 0}
                    </div>
                  </div>
                  {post.isReel && (
                    <div className="absolute top-2 right-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white" className="drop-shadow-md">
                        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
