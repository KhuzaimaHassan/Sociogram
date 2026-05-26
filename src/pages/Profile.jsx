import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as userApi from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { mediaUrl } from '../services/apiClient';
import { formatCount } from '../utils/formatTime';
import Avatar from '../components/shared/Avatar';
import Modal from '../components/shared/Modal';
import { posts as MOCK_POSTS } from '../data/mockPosts';
import { getPostVisual } from '../utils/postVisual';

// Build a mock profile from the posts and a given username
function buildMockProfile(username, meUser) {
  const userPosts = MOCK_POSTS.filter(
    (p) => (p.userId || p.user?.username) === username
  );
  const displayPosts = userPosts.length > 0 ? userPosts : MOCK_POSTS.slice(0, 6);
  return {
    id: meUser?.id || 'demo-1',
    username: username || meUser?.username || 'demo.user',
    displayName: meUser?.displayName || username || 'Demo User',
    avatar: meUser?.avatar || '😎',
    bio: meUser?.bio || '👋 Exploring Sociogram!',
    isFollowing: false,
    _count: { posts: displayPosts.length, followers: 42, following: 18 },
    posts: displayPosts.map((p) => ({
      id: p.id,
      mediaUrl: p.mediaUrl || null,
      mediaType: p.mediaType || 'image',
      mediaEmoji: p.mediaEmoji,
      mediaBg: p.mediaBg,
      isReel: p.isReel,
      _count: { likes: p.likes || 0, comments: p.comments || 0 },
    })),
  };
}

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

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: '', bio: '', avatar: '' });
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const data = await userApi.getProfile(username);
      setProfile(data);
    } catch {
      // Demo fallback — build a profile from mock data
      await new Promise((r) => setTimeout(r, 300));
      setProfile(buildMockProfile(username, me));
    } finally {
      setLoading(false);
    }
  }, [username, me]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function openEdit() {
    setEditForm({
      displayName: profile?.displayName || '',
      bio: profile?.bio || '',
      avatar: profile?.avatar || '',
    });
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
        setProfile((p) => ({
          ...p,
          isFollowing: false,
          _count: { ...p._count, followers: Math.max(0, (p._count.followers || 0) - 1) },
        }));
      } else {
        await userApi.followUser(profile.id);
        setProfile((p) => ({
          ...p,
          isFollowing: true,
          _count: { ...p._count, followers: (p._count.followers || 0) + 1 },
        }));
      }
    } catch (err) {
      console.warn(err.message);
    } finally {
      setFollowBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="feed-container py-16 text-center">
        <div className="inline-block w-8 h-8 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="feed-container py-16 text-center px-6">
        <div className="text-4xl mb-2">🤷</div>
        <p className="text-white font-semibold">Profile unavailable</p>
        <p className="text-xs text-surface-400 mt-1">{error || 'User not found.'}</p>
      </div>
    );
  }

  const counts = profile._count || { posts: 0, followers: 0, following: 0 };

  return (
    <div className="feed-container pb-24">
      <div className="px-4 py-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">{profile.username}</h2>
          {isOwnProfile && (
            <button
              onClick={() => navigate('/settings')}
              className="action-btn"
              id="profile-menu"
              title="Settings"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-6">
          <Avatar emoji={profile.avatar || '😎'} size="2xl" />
          <div className="flex-1 grid grid-cols-3 gap-1 text-center">
            {[
              ['Posts', counts.posts],
              ['Followers', counts.followers],
              ['Following', counts.following],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-lg font-bold text-white">{formatCount(val)}</p>
                <p className="text-xs text-surface-400">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm font-semibold text-white">{profile.displayName || profile.username}</p>
          {profile.bio && (
            <p className="text-sm text-surface-300 whitespace-pre-line mt-0.5">{profile.bio}</p>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          {isOwnProfile ? (
            <>
              <button
                onClick={openEdit}
                className="flex-1 py-2 rounded-lg bg-dark-elevated border border-dark-border/50 text-sm font-semibold text-white hover:bg-dark-border/30 transition-colors"
                id="edit-profile"
              >
                Edit Profile
              </button>
              <button
                onClick={() => {
                  logout();
                  navigate('/login', { replace: true });
                }}
                className="flex-1 py-2 rounded-lg bg-dark-elevated border border-dark-border/50 text-sm font-semibold text-white hover:bg-dark-border/30 transition-colors"
                id="logout-button"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleFollowToggle}
                disabled={followBusy}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  profile.isFollowing
                    ? 'bg-dark-elevated border border-dark-border/50 text-white hover:bg-dark-border/30'
                    : 'bg-gradient-to-r from-brand-600 to-accent-pink text-white'
                }`}
              >
                {profile.isFollowing ? 'Following' : 'Follow'}
              </button>
              <button className="flex-1 py-2 rounded-lg bg-dark-elevated border border-dark-border/50 text-sm font-semibold text-white">
                Message
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex border-b border-dark-border/30">
        <button className="flex-1 py-3 text-center border-b-2 border-white">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="inline text-white">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
        </button>
        <button className="flex-1 py-3 text-center border-b-2 border-transparent text-surface-500">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="inline">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
          </svg>
        </button>
      </div>

      {profile.posts && profile.posts.length > 0 ? (
        <div className="grid grid-cols-3 gap-0.5">
          {profile.posts.map((post) => {
            const url = mediaUrl(post.mediaUrl);
            return (
              <div key={post.id} className="aspect-square relative group cursor-pointer overflow-hidden">
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
                      <span className="text-3xl select-none">{v.emoji}</span>
                    </div>
                  );
                })()}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    ❤️ {formatCount(post._count?.likes || post.likes || 0)}
                  </span>
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
          <div className="text-4xl mb-2">📸</div>
          <p className="text-white font-semibold">No posts yet</p>
          {isOwnProfile && (
            <button
              onClick={() => navigate('/create')}
              className="mt-3 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-accent-pink text-white text-sm font-semibold"
            >
              Share your first post
            </button>
          )}
        </div>
      )}

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit profile" size="md">
        <form onSubmit={saveEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1.5">Display name</label>
            <input
              type="text"
              value={editForm.displayName}
              onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm text-white focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1.5">Avatar (emoji)</label>
            <input
              type="text"
              value={editForm.avatar}
              onChange={(e) => setEditForm((f) => ({ ...f, avatar: e.target.value }))}
              maxLength={4}
              className="w-24 px-4 py-2.5 rounded-xl bg-dark-elevated border border-dark-border/50 text-2xl text-white text-center focus:outline-none focus:border-brand-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1.5">Bio</label>
            <textarea
              value={editForm.bio}
              onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm text-white focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
            />
          </div>
          {editError && (
            <div className="px-3 py-2 rounded-lg bg-accent-rose/10 border border-accent-rose/30 text-xs text-accent-rose">
              {editError}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="flex-1 py-2.5 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm font-medium text-white hover:bg-dark-border/30"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-pink text-white text-sm font-semibold disabled:opacity-50"
            >
              {editSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
