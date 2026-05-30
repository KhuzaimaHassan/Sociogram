/**
 * Profile.jsx — Full user profile page.
 *
 * Features:
 * - Real API data (no mock fallback)
 * - Clickable follower / following counts → modal with list + follow buttons
 * - Follow / Unfollow with optimistic counter
 * - Message button → opens DM conversation
 * - Edit profile modal (display name, bio, avatar emoji)
 * - Grid of posts + Reels tab
 * - Tap post → preview modal
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as userApi from '../services/userService';
import * as dmApi from '../services/dmService';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../services/apiClient';
import { formatCount } from '../utils/formatTime';
import Avatar from '../components/shared/Avatar';
import Modal from '../components/shared/Modal';
import { getPostVisual } from '../utils/postVisual';

// ── Follow/Unfollow button (reusable) ────────────────────────
function FollowBtn({ userId, initial, onChanged, className = '' }) {
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (following) {
        await userApi.unfollowUser(userId);
        setFollowing(false);
        onChanged?.(false);
      } else {
        await userApi.followUser(userId);
        setFollowing(true);
        onChanged?.(true);
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
      } ${className}`}
    >
      {busy ? '…' : following ? 'Following' : 'Follow'}
    </button>
  );
}

// ── Followers / Following list modal ─────────────────────────
function PeopleModal({ title, userId, type, onClose }) {
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fn = type === 'followers' ? userApi.getFollowers : userApi.getFollowing;
    fn(userId)
      .then(setPeople)
      .catch(() => setPeople([]))
      .finally(() => setLoading(false));
  }, [userId, type]);

  return (
    <Modal isOpen onClose={onClose} title={title} size="md">
      {loading ? (
        <div className="py-8 flex justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
        </div>
      ) : people.length === 0 ? (
        <div className="py-8 text-center text-surface-400 text-sm">No one here yet.</div>
      ) : (
        <div className="space-y-1 max-h-[60vh] overflow-y-auto -mx-1">
          {people.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/4 transition-colors">
              <button
                onClick={() => { onClose(); navigate(`/profile/${u.username}`); }}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <span className="text-2xl">{u.avatar || '😎'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{u.username}</p>
                  {u.displayName && (
                    <p className="text-xs text-surface-400 truncate">{u.displayName}</p>
                  )}
                </div>
              </button>
              {u.id !== me?.id && (
                <FollowBtn userId={u.id} initial={u.isFollowing} />
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ── Post preview modal ────────────────────────────────────────
function PostPreview({ post, onClose }) {
  const url = mediaUrl(post.mediaUrl);
  const visual = url ? null : getPostVisual(post);
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-sm w-full rounded-2xl overflow-hidden bg-dark-elevated" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white">✕</button>
        <div className="aspect-square">
          {url ? (
            post.mediaType === 'video'
              ? <video src={url} className="w-full h-full object-cover" controls autoPlay muted playsInline />
              : <img src={url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: visual?.gradient }}>
              <span className="text-6xl">{visual?.emoji}</span>
            </div>
          )}
        </div>
        <div className="px-4 py-3 flex items-center gap-5">
          <span className="text-sm text-white/70">❤️ {formatCount(post._count?.likes || 0)}</span>
          <span className="text-sm text-white/70">💬 {post._count?.comments || 0}</span>
        </div>
        {post.caption && <p className="px-4 pb-4 text-sm text-white/80 line-clamp-3">{post.caption}</p>}
      </div>
    </div>
  );
}

// ── Main Profile ──────────────────────────────────────────────
export default function Profile() {
  const { username: routeUsername } = useParams();
  const { user: me, logout, setUser } = useAuth();
  const navigate = useNavigate();

  const username = routeUsername || me?.username;
  const isOwnProfile = !routeUsername || routeUsername === me?.username;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [tab, setTab] = useState('posts'); // 'posts' | 'reels'
  const [selectedPost, setSelectedPost] = useState(null);

  // Modals
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: '', bio: '', avatar: '' });
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [peopleModal, setPeopleModal] = useState(null); // { type: 'followers'|'following', title, userId }

  const refresh = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const data = await userApi.getProfile(username);
      setProfile(data);
    } catch (err) {
      setError(err.message || 'Profile not found');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => { refresh(); }, [refresh]);

  function openEdit() {
    setEditForm({ displayName: profile?.displayName || '', bio: profile?.bio || '', avatar: profile?.avatar || '' });
    setEditError(null);
    setEditOpen(true);
  }

  async function saveEdit(e) {
    e.preventDefault();
    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await userApi.updateProfile(editForm);
      setProfile((p) => ({ ...p, ...updated }));
      setUser((u) => ({ ...u, ...updated }));
      setEditOpen(false);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleFollowToggle() {
    if (!profile || followBusy) return;
    setFollowBusy(true);
    try {
      if (profile.isFollowing) {
        await userApi.unfollowUser(profile.id);
        setProfile((p) => ({ ...p, isFollowing: false, _count: { ...p._count, followers: Math.max(0, (p._count.followers || 0) - 1) } }));
      } else {
        await userApi.followUser(profile.id);
        setProfile((p) => ({ ...p, isFollowing: true, _count: { ...p._count, followers: (p._count.followers || 0) + 1 } }));
      }
    } catch { /* ignore */ }
    finally { setFollowBusy(false); }
  }

  async function handleMessage() {
    try {
      const conv = await dmApi.getOrCreateConversation(profile.id);
      navigate(`/messages/${conv.id}`);
    } catch { navigate('/messages'); }
  }

  if (loading) return (
    <div className="feed-container py-20 text-center">
      <div className="inline-block w-8 h-8 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
    </div>
  );

  if (error || !profile) return (
    <div className="feed-container py-20 text-center px-6">
      <div className="text-5xl mb-3">🤷</div>
      <p className="text-white font-semibold">Profile not found</p>
      <p className="text-xs text-surface-400 mt-1">{error}</p>
    </div>
  );

  const counts = profile._count || { posts: 0, followers: 0, following: 0 };
  const allPosts = profile.posts || [];
  const visiblePosts = tab === 'reels' ? allPosts.filter((p) => p.isReel) : allPosts.filter((p) => !p.isReel);

  return (
    <div className="feed-container pb-24">
      {/* ── Header ── */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">{profile.username}</h2>
          {isOwnProfile && (
            <button onClick={() => navigate('/settings')} className="action-btn" id="profile-menu">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Avatar + counts */}
        <div className="flex items-center gap-5">
          <Avatar emoji={profile.avatar || '😎'} size="2xl" />
          <div className="flex-1 grid grid-cols-3 gap-1 text-center">
            <button
              className="flex flex-col items-center group"
              onClick={() => {/* no-op for posts */}}
            >
              <p className="text-lg font-bold text-white group-hover:text-brand-400 transition-colors">{formatCount(counts.posts)}</p>
              <p className="text-xs text-surface-400">Posts</p>
            </button>
            <button
              className="flex flex-col items-center group"
              onClick={() => setPeopleModal({ type: 'followers', title: `Followers`, userId: profile.id })}
            >
              <p className="text-lg font-bold text-white group-hover:text-brand-400 transition-colors">{formatCount(counts.followers)}</p>
              <p className="text-xs text-surface-400">Followers</p>
            </button>
            <button
              className="flex flex-col items-center group"
              onClick={() => setPeopleModal({ type: 'following', title: `Following`, userId: profile.id })}
            >
              <p className="text-lg font-bold text-white group-hover:text-brand-400 transition-colors">{formatCount(counts.following)}</p>
              <p className="text-xs text-surface-400">Following</p>
            </button>
          </div>
        </div>

        {/* Name + bio */}
        <div className="mt-4">
          <p className="text-sm font-semibold text-white">{profile.displayName || profile.username}</p>
          {profile.bio && <p className="text-sm text-surface-300 whitespace-pre-line mt-0.5">{profile.bio}</p>}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          {isOwnProfile ? (
            <>
              <button onClick={openEdit} className="flex-1 py-2 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm font-semibold text-white hover:bg-white/8 transition-colors" id="edit-profile">
                Edit Profile
              </button>
              <button onClick={() => { logout(); navigate('/login', { replace: true }); }} className="flex-1 py-2 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm font-semibold text-white hover:bg-white/8 transition-colors" id="logout-button">
                Log out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleFollowToggle}
                disabled={followBusy}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.98] ${
                  profile.isFollowing
                    ? 'bg-dark-elevated border border-dark-border/50 text-white hover:bg-white/8'
                    : 'bg-gradient-to-r from-brand-600 to-accent-pink text-white shadow-lg shadow-brand-500/20'
                }`}
                id="follow-btn"
              >
                {followBusy ? '…' : profile.isFollowing ? 'Following' : 'Follow'}
              </button>
              <button
                onClick={handleMessage}
                className="flex-1 py-2 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm font-semibold text-white hover:bg-white/8 transition-colors flex items-center justify-center gap-2"
                id="message-btn"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Message
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Posts / Reels tab bar ── */}
      <div className="flex border-b border-dark-border/30">
        <button
          onClick={() => setTab('posts')}
          className={`flex-1 py-3 flex items-center justify-center border-b-2 transition-colors ${tab === 'posts' ? 'border-white text-white' : 'border-transparent text-surface-500 hover:text-surface-300'}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
        </button>
        <button
          onClick={() => setTab('reels')}
          className={`flex-1 py-3 flex items-center justify-center border-b-2 transition-colors ${tab === 'reels' ? 'border-white text-white' : 'border-transparent text-surface-500 hover:text-surface-300'}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>

      {/* ── Posts grid ── */}
      {visiblePosts.length > 0 ? (
        <div className="grid grid-cols-3 gap-0.5">
          {visiblePosts.map((post) => {
            const url = mediaUrl(post.mediaUrl);
            const visual = url ? null : getPostVisual(post);
            return (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="aspect-square relative group cursor-pointer overflow-hidden"
              >
                {url ? (
                  post.mediaType === 'video'
                    ? <video src={url} className="w-full h-full object-cover bg-black" muted loop playsInline />
                    : <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: visual?.gradient }}>
                    <span className="text-3xl select-none">{visual?.emoji}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <span className="text-white text-sm font-semibold">❤️ {formatCount(post._count?.likes || 0)}</span>
                  <span className="text-white text-sm font-semibold">💬 {post._count?.comments || 0}</span>
                </div>
                {post.isReel && (
                  <div className="absolute top-1.5 right-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center px-6">
          <div className="text-5xl mb-3">{tab === 'reels' ? '🎬' : '📸'}</div>
          <p className="text-white font-semibold">No {tab} yet</p>
          {isOwnProfile && tab === 'posts' && (
            <button onClick={() => navigate('/create')} className="mt-3 px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-accent-pink text-white text-sm font-semibold shadow-lg shadow-brand-500/20">
              Share your first post
            </button>
          )}
        </div>
      )}

      {/* ── Post preview modal ── */}
      {selectedPost && <PostPreview post={selectedPost} onClose={() => setSelectedPost(null)} />}

      {/* ── Followers / Following modal ── */}
      {peopleModal && (
        <PeopleModal
          title={peopleModal.title}
          userId={peopleModal.userId}
          type={peopleModal.type}
          onClose={() => setPeopleModal(null)}
        />
      )}

      {/* ── Edit profile modal ── */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit profile" size="md">
        <form onSubmit={saveEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1.5">Display name</label>
            <input type="text" value={editForm.displayName}
              onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm text-white focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1.5">Avatar (emoji)</label>
            <input type="text" value={editForm.avatar}
              onChange={(e) => setEditForm((f) => ({ ...f, avatar: e.target.value }))}
              maxLength={4}
              className="w-20 px-3 py-2.5 rounded-xl bg-dark-elevated border border-dark-border/50 text-2xl text-white text-center focus:outline-none focus:border-brand-500/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1.5">Bio</label>
            <textarea value={editForm.bio}
              onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
              rows={4} maxLength={200}
              className="w-full px-4 py-2.5 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm text-white focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 resize-none" />
          </div>
          {editError && (
            <div className="px-3 py-2 rounded-xl bg-accent-rose/10 border border-accent-rose/30 text-xs text-accent-rose">{editError}</div>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setEditOpen(false)}
              className="flex-1 py-2.5 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm font-medium text-white hover:bg-white/8">
              Cancel
            </button>
            <button type="submit" disabled={editSaving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-pink text-white text-sm font-semibold disabled:opacity-50">
              {editSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
