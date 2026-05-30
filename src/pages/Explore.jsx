/**
 * Explore.jsx — Discover trending posts and find new creators.
 *
 * Features:
 * - Real-time search with debounce (250ms)
 * - Search results show follow/unfollow button inline
 * - "Suggested for you" horizontal scroll strip
 * - Masonry-style grid (every 5th post = 2×2)
 * - Tap post to open fullscreen preview modal
 * - Video posts autoplay in grid preview
 * - Reel badge on video posts
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as postApi from '../services/postService';
import * as userApi from '../services/userService';
import { mediaUrl } from '../services/apiClient';
import { formatCount } from '../utils/formatTime';
import Avatar from '../components/shared/Avatar';
import { getPostVisual } from '../utils/postVisual';
import { useAuth } from '../context/AuthContext';

// ── Inline follow button used in search + suggested ──────────
function FollowBtn({ userId, initial, onFollowChange }) {
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle(e) {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      if (following) {
        await userApi.unfollowUser(userId);
        setFollowing(false);
        onFollowChange?.(false);
      } else {
        await userApi.followUser(userId);
        setFollowing(true);
        onFollowChange?.(true);
      }
    } catch { /* ignore */ }
    finally { setBusy(false); }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 active:scale-95 ${
        following
          ? 'bg-white/10 text-white border border-white/20 hover:bg-accent-rose/20 hover:text-accent-rose hover:border-accent-rose/30'
          : 'bg-brand-600 text-white hover:bg-brand-500'
      }`}
    >
      {busy ? '…' : following ? 'Following' : 'Follow'}
    </button>
  );
}

// ── Post preview modal ────────────────────────────────────────
function PostModal({ post, onClose }) {
  const url = mediaUrl(post.mediaUrl);
  const visual = url ? null : getPostVisual(post);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-sm w-full rounded-2xl overflow-hidden bg-dark-elevated shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white"
        >
          ✕
        </button>

        {/* Media */}
        <div className="aspect-square">
          {url ? (
            post.mediaType === 'video' ? (
              <video src={url} className="w-full h-full object-cover" controls autoPlay muted playsInline />
            ) : (
              <img src={url} alt="" className="w-full h-full object-cover" />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: visual?.gradient }}>
              <span className="text-6xl">{visual?.emoji}</span>
            </div>
          )}
        </div>

        {/* Stats footer */}
        <div className="px-4 py-3 flex items-center gap-6">
          <div className="flex items-center gap-1.5 text-sm text-white/70">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" className="opacity-70">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {formatCount(post._count?.likes || post.likes || 0)}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-white/70">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" className="opacity-70">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {formatCount(post._count?.comments || post.comments || 0)}
          </div>
          {post.user?.username && (
            <button
              onClick={() => { onClose(); navigate(`/profile/${post.user.username}`); }}
              className="ml-auto text-xs text-brand-400 font-medium hover:text-brand-300"
            >
              @{post.user.username}
            </button>
          )}
        </div>

        {post.caption && (
          <p className="px-4 pb-4 text-sm text-white/80 line-clamp-3">{post.caption}</p>
        )}
      </div>
    </div>
  );
}

// ── Suggested users horizontal strip ─────────────────────────
function SuggestedStrip() {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    userApi.getSuggested().then(setUsers).catch(() => {});
  }, []);

  if (!users.length) return null;

  return (
    <div className="mb-3">
      <p className="px-4 text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">
        Suggested for you
      </p>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex-shrink-0 w-36 rounded-2xl bg-dark-elevated border border-dark-border/30 p-3 flex flex-col items-center gap-2"
          >
            <button onClick={() => navigate(`/profile/${u.username}`)} className="flex flex-col items-center gap-1">
              <span className="text-3xl">{u.avatar || '😎'}</span>
              <p className="text-xs font-semibold text-white truncate max-w-full">{u.username}</p>
              <p className="text-[10px] text-surface-500">{formatCount(u._count?.followers || 0)} followers</p>
            </button>
            <FollowBtn
              userId={u.id}
              initial={false}
              onFollowChange={(following) => {
                if (following) setUsers((prev) => prev.filter((x) => x.id !== u.id));
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Explore page ─────────────────────────────────────────
export default function Explore() {
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [selectedPost, setSelectedPost] = useState(null);
  const inputRef = useRef(null);

  // Load explore grid
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await postApi.getExplore({ limit: 30 });
      setPosts(data.posts || []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Debounced user search
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchResults([]); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const results = await userApi.searchUsers(q);
        if (!cancelled) setSearchResults(results || []);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [searchQuery]);

  const showSearch = searchQuery.trim().length >= 2;

  return (
    <div className="feed-container">
      {/* ── Search bar ── */}
      <div className="px-4 pt-3 pb-3 sticky top-0 z-20 glass-elevated border-b border-dark-border/20">
        <div className="relative">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search creators…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-dark-border/40 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
            id="explore-search"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Search results ── */}
      {showSearch ? (
        <div className="pb-24">
          {searching && (
            <div className="flex items-center justify-center py-10 gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
              <span className="text-xs text-surface-400">Searching…</span>
            </div>
          )}
          {!searching && searchResults.length === 0 && (
            <div className="text-center py-16 px-6">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-white font-semibold">No creators found</p>
              <p className="text-xs text-surface-400 mt-1">Try a different username or display name</p>
            </div>
          )}
          {searchResults.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/4 transition-colors">
              <button
                onClick={() => navigate(`/profile/${u.username}`)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <div className="w-12 h-12 rounded-full bg-dark-elevated flex items-center justify-center text-xl flex-shrink-0">
                  {u.avatar || '😎'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{u.username}</p>
                  {u.displayName && (
                    <p className="text-xs text-surface-400 truncate">{u.displayName}</p>
                  )}
                  <p className="text-xs text-surface-500">
                    {formatCount(u._count?.followers || 0)} followers · {formatCount(u._count?.posts || 0)} posts
                  </p>
                </div>
              </button>
              {u.id !== me?.id && (
                <FollowBtn userId={u.id} initial={u.isFollowing} />
              )}
            </div>
          ))}
        </div>
      ) : (
        /* ── Explore grid ── */
        <div className="pb-24">
          <div className="pt-3">
            <SuggestedStrip />
          </div>

          {loading && (
            <div className="py-16 text-center">
              <div className="inline-block w-8 h-8 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
            </div>
          )}

          {!loading && posts.length === 0 && (
            <div className="py-16 text-center px-6">
              <div className="text-5xl mb-3">🌌</div>
              <p className="text-white font-semibold text-base">Nothing here yet</p>
              <p className="text-xs text-surface-400 mt-1">Be the first to share something!</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((post, idx) => {
              const isLarge = idx % 7 === 0;
              const url = mediaUrl(post.mediaUrl);
              const visual = url ? null : getPostVisual(post);

              return (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className={`relative overflow-hidden group cursor-pointer aspect-square ${isLarge ? 'col-span-2 row-span-2' : ''}`}
                >
                  {url ? (
                    post.mediaType === 'video' ? (
                      <video src={url} className="w-full h-full object-cover bg-black" muted loop playsInline />
                    ) : (
                      <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: visual?.gradient }}>
                      <span className={`${isLarge ? 'text-5xl' : 'text-3xl'} select-none`}>{visual?.emoji}</span>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      {formatCount(post._count?.likes || 0)}
                    </div>
                    <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      {post._count?.comments || 0}
                    </div>
                  </div>

                  {/* Reel badge */}
                  {post.isReel && (
                    <div className="absolute top-2 right-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white" className="drop-shadow-md">
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

      {/* ── Post preview modal ── */}
      {selectedPost && (
        <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  );
}
