/**
 * CreatePost.jsx — Full-featured post creation page.
 *
 * Supports:
 * - Image / Video upload with local preview
 * - Text-only posts (no media required)
 * - Upload progress bar (XHR-based for real progress tracking)
 * - Cloudinary CDN on production / local on dev (transparent)
 * - Drag & drop file selection
 * - Location tag
 * - Mark as Reel (auto-detected for video)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, tokenStore } from '../services/apiClient';

const ACCEPT_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/avif,video/mp4,video/webm,video/quicktime';
const MAX_BYTES = 50 * 1024 * 1024;

function UploadProgressBar({ percent }) {
  return (
    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-brand-500 to-accent-pink rounded-full transition-all duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default function CreatePost() {
  const navigate = useNavigate();
  const { addPostToFeed, showToast } = useApp();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [isReel, setIsReel] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  function handleFile(selected) {
    if (!selected) return;
    if (selected.size > MAX_BYTES) { setError('File too large. Max 50 MB.'); return; }
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setPreviewType(selected.type.startsWith('video/') ? 'video' : 'image');
    if (selected.type.startsWith('video/')) setIsReel(true);
  }

  // Drag & drop
  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  function removeMedia() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setPreviewType(null);
    setIsReel(false);
    setUploadPercent(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    if (!file && !caption.trim()) {
      setError('Add a photo, video, or write something first.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setUploadPercent(0);

    try {
      const post = await postApi.createPost(
        { caption: caption.trim(), location: location.trim(), isReel, mediaFile: file },
        (e) => {
          if (e.lengthComputable) {
            setUploadPercent(Math.round((e.loaded / e.total) * 95));
          }
        }
      );
      setUploadPercent(100);

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
      setUploadPercent(0);
    } finally {
      setSubmitting(false);
    }
  }

  const charCount = caption.length;
  const charLimit = 2200;

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-elevated border-b border-dark-border/30">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
          <button
            onClick={() => navigate(-1)}
            className="action-btn text-white/80"
            id="create-cancel"
            disabled={submitting}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-white">New post</h1>
          <button
            form="create-post-form"
            type="submit"
            disabled={submitting || (!file && !caption.trim())}
            className="text-sm font-semibold text-brand-400 hover:text-brand-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            id="create-share"
          >
            {submitting ? 'Sharing…' : 'Share'}
          </button>
        </div>

        {/* Upload progress bar */}
        {submitting && file && (
          <div className="px-4 pb-2">
            <UploadProgressBar percent={uploadPercent} />
            <p className="text-xs text-surface-400 mt-1 text-center">
              {uploadPercent < 95 ? `Uploading… ${uploadPercent}%` : 'Processing…'}
            </p>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-5 space-y-4">
        <form id="create-post-form" onSubmit={handleSubmit}>

          {/* Media picker */}
          <div
            ref={dropRef}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !previewUrl && fileInputRef.current?.click()}
            className={`relative w-full aspect-square rounded-2xl border-2 border-dashed overflow-hidden transition-all duration-200 ${
              dragging
                ? 'border-brand-500 bg-brand-500/10 scale-[1.01]'
                : previewUrl
                  ? 'border-transparent cursor-default'
                  : 'border-dark-border bg-dark-elevated/40 cursor-pointer hover:border-brand-500/50 hover:bg-dark-elevated/60'
            }`}
          >
            {previewUrl ? (
              <>
                {previewType === 'video' ? (
                  <video src={previewUrl} className="w-full h-full object-cover" controls muted playsInline />
                ) : (
                  <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                )}
                {/* Remove button */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeMedia(); }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white text-sm hover:bg-black/80 transition-colors"
                  title="Remove media"
                >
                  ✕
                </button>
                {/* Change button */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/60 text-white text-xs font-medium hover:bg-black/80 transition-colors"
                >
                  Change
                </button>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-surface-400 group-hover:text-white transition-colors select-none">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600/20 to-accent-pink/20 border border-brand-500/20 flex items-center justify-center mb-3">
                  <span className="text-3xl">📸</span>
                </div>
                <p className="text-sm font-medium text-white/80">
                  {dragging ? 'Drop it!' : 'Tap to add photo or video'}
                </p>
                <p className="text-xs text-surface-500 mt-1">
                  Drag & drop • Max 50 MB
                </p>
                <p className="text-xs text-surface-500 mt-0.5 opacity-60">
                  Optional — you can post text only
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_TYPES}
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="hidden"
              disabled={submitting}
            />
          </div>

          {/* Caption */}
          <div className="mt-4">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              maxLength={charLimit}
              placeholder={`What's on your mind, ${user?.username || 'friend'}?`}
              className="w-full px-4 py-3 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 resize-none transition-colors"
              disabled={submitting}
            />
            <div className="flex justify-end mt-1">
              <span className={`text-xs ${charCount > charLimit * 0.9 ? 'text-accent-rose' : 'text-surface-500'}`}>
                {charCount}/{charLimit}
              </span>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1.5">
              📍 Location (optional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
              className="w-full px-4 py-2.5 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-colors"
              disabled={submitting}
            />
          </div>

          {/* Reel toggle */}
          <label className="flex items-center justify-between px-4 py-3 rounded-xl bg-dark-elevated border border-dark-border/50 cursor-pointer hover:border-brand-500/30 transition-colors">
            <div>
              <p className="text-sm font-medium text-white">🎬 Share as Reel</p>
              <p className="text-xs text-surface-400">Show in the short-video feed</p>
            </div>
            <div
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isReel ? 'bg-brand-500' : 'bg-white/10'}`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isReel ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
              <input
                type="checkbox"
                checked={isReel}
                onChange={(e) => setIsReel(e.target.checked)}
                className="sr-only"
                disabled={submitting}
              />
            </div>
          </label>

          {/* Error */}
          {error && (
            <div className="px-3 py-2.5 rounded-xl bg-accent-rose/10 border border-accent-rose/30 text-xs text-accent-rose flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Submit button (mobile-friendly large button at bottom) */}
          <button
            type="submit"
            disabled={submitting || (!file && !caption.trim())}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-accent-pink text-white font-semibold text-sm shadow-lg shadow-brand-500/25 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-brand-500/40 transition-all duration-200 active:scale-[0.98]"
            id="create-submit"
          >
            {submitting
              ? (file ? `Uploading ${uploadPercent}%…` : 'Sharing…')
              : '✨ Share Post'}
          </button>
        </form>
      </main>
    </div>
  );
}
