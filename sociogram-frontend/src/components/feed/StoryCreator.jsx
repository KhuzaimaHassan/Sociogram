/**
 * StoryCreator.jsx — Modal for creating a new story.
 * Tap "Your Story" in StoriesBar to open this.
 */

import { useState, useRef } from 'react';
import { createStory } from '../../services/storyService';

const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,image/avif,video/mp4,video/webm';

export default function StoryCreator({ onClose, onCreated }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  function handleFile(f) {
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) { setError('Max 50 MB'); return; }
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setPreviewType(f.type.startsWith('video/') ? 'video' : 'image');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const story = await createStory(file, caption, setProgress);
      setProgress(100);
      onCreated(story);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" id="story-creator">
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(18,18,28,0.98) 0%, rgba(14,14,22,0.98) 100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border/30">
          <h2 className="text-base font-semibold text-white">Add Story</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Media picker */}
          <div
            onClick={() => inputRef.current?.click()}
            className={`relative w-full aspect-[9/16] max-h-80 rounded-2xl border-2 border-dashed overflow-hidden cursor-pointer flex items-center justify-center transition-colors ${
              preview ? 'border-transparent' : 'border-dark-border/50 hover:border-brand-500/50'
            }`}
          >
            {preview ? (
              previewType === 'video'
                ? <video src={preview} className="w-full h-full object-cover" muted playsInline />
                : <img src={preview} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center text-surface-400">
                <span className="text-4xl mb-2 block">📸</span>
                <p className="text-sm font-medium text-white/70">Tap to pick photo or video</p>
                <p className="text-xs text-surface-500 mt-0.5">Disappears in 24 hours</p>
              </div>
            )}
            <input ref={inputRef} type="file" accept={ACCEPT} onChange={(e) => handleFile(e.target.files?.[0])} className="hidden" />
          </div>

          {/* Caption */}
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption… (optional)"
            maxLength={150}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-dark-border/30 text-sm text-white placeholder-surface-500 focus:outline-none focus:border-brand-500/50 transition-colors"
          />

          {/* Upload progress */}
          {uploading && (
            <div className="space-y-1.5">
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-accent-pink rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-surface-400 text-center">
                {progress < 95 ? `Uploading ${progress}%…` : 'Processing…'}
              </p>
            </div>
          )}

          {error && (
            <p className="text-xs text-accent-rose bg-accent-rose/10 border border-accent-rose/20 rounded-xl px-3 py-2">
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-accent-pink text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40 transition-all active:scale-[0.98]"
          >
            {uploading ? 'Sharing…' : '✨ Share Story'}
          </button>
        </form>
      </div>
    </div>
  );
}
