import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as postApi from '../services/postService';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

const ACCEPT_TYPES = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime';
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export default function CreatePost() {
  const navigate = useNavigate();
  const { addPostToFeed, showToast } = useApp();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [isReel, setIsReel] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFile(selected) {
    if (!selected) return;
    if (selected.size > MAX_BYTES) {
      setError('File is too large. Max 50 MB.');
      return;
    }
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setPreviewType(selected.type.startsWith('video/') ? 'video' : 'image');
    if (selected.type.startsWith('video/')) setIsReel(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    if (!file && !caption.trim()) {
      setError('Add a photo, video, or caption first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const post = await postApi.createPost({
        caption: caption.trim() || undefined,
        location: location.trim() || undefined,
        isReel,
        mediaFile: file || undefined,
      });
      addPostToFeed({
        ...post,
        likes: post._count?.likes || 0,
        comments: post._count?.comments || 0,
        reactions: {},
        liked: false,
        myReaction: null,
        saved: false,
      });
      showToast('Post shared ✨', { duration: 2500 });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      <header className="sticky top-0 z-30 glass-elevated border-b border-dark-border/30">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
          <button
            onClick={() => navigate(-1)}
            className="action-btn text-white/80"
            id="create-cancel"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-white">New post</h1>
          <button
            form="create-post-form"
            type="submit"
            disabled={submitting}
            className="text-sm font-semibold text-brand-400 hover:text-brand-300 disabled:opacity-40"
          >
            {submitting ? 'Sharing…' : 'Share'}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-5">
        <form id="create-post-form" onSubmit={handleSubmit} className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative w-full aspect-square rounded-2xl border-2 border-dashed border-dark-border bg-dark-elevated/40 overflow-hidden cursor-pointer group"
          >
            {previewUrl ? (
              previewType === 'video' ? (
                <video src={previewUrl} className="w-full h-full object-cover" controls muted />
              ) : (
                <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
              )
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-surface-400 group-hover:text-white transition-colors">
                <span className="text-5xl mb-2">📸</span>
                <p className="text-sm font-medium">Tap to upload media</p>
                <p className="text-xs text-surface-500 mt-0.5">Image or video, up to 50 MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_TYPES}
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="hidden"
            />
          </div>

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            maxLength={2200}
            placeholder={`What's on your mind, ${user?.username || 'friend'}?`}
            className="w-full px-4 py-3 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 resize-none"
          />

          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1.5">Location (optional)</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
              className="w-full px-4 py-2.5 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
            />
          </div>

          <label className="flex items-center justify-between px-4 py-3 rounded-xl bg-dark-elevated border border-dark-border/50 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-white">Share as Reel</p>
              <p className="text-xs text-surface-400">Show in the Reels feed</p>
            </div>
            <input
              type="checkbox"
              checked={isReel}
              onChange={(e) => setIsReel(e.target.checked)}
              className="w-5 h-5 accent-brand-500"
            />
          </label>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-accent-rose/10 border border-accent-rose/30 text-xs text-accent-rose">
              {error}
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
