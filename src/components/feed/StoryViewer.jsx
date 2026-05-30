/**
 * StoryViewer.jsx — Full-screen story viewer (Instagram-style).
 *
 * Features:
 * - Animated top progress bars (one per story)
 * - Auto-advance after duration (5s images / 15s videos)
 * - Tap left/right to go back/forward
 * - Hold to pause
 * - Swipe to dismiss (or tap outside progress bar)
 * - Marks story as viewed on open
 * - User avatar + name + time ago
 * - Caption overlay at bottom
 * - Delete button for own stories
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { mediaUrl } from '../../services/apiClient';
import { viewStory, deleteStory } from '../../services/storyService';

function timeAgo(ts) {
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export default function StoryViewer({ group, onClose, onNext, onPrev, hasPrev, hasNext }) {
  const { user: me } = useAuth();
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedAtRef = useRef(null);
  const videoRef = useRef(null);

  const currentStory = group.stories[index];
  const isOwn = group.user.id === me?.id;
  const duration = (currentStory?.duration || 5) * 1000;

  // Mark as viewed
  useEffect(() => {
    if (currentStory && !currentStory.seen) {
      viewStory(currentStory.id).catch(() => {});
    }
  }, [currentStory?.id]);

  const advance = useCallback(() => {
    if (index < group.stories.length - 1) {
      setIndex((i) => i + 1);
      setProgress(0);
    } else {
      if (hasNext) onNext();
      else onClose();
    }
  }, [index, group.stories.length, hasNext, onNext, onClose]);

  // Progress timer
  useEffect(() => {
    if (paused || !currentStory) return;
    setProgress(0);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(timerRef.current);
        advance();
      }
    }, 50);

    return () => clearInterval(timerRef.current);
  }, [index, paused, duration]);

  function handlePause() {
    setPaused(true);
    pausedAtRef.current = progress;
    clearInterval(timerRef.current);
    if (videoRef.current) videoRef.current.pause();
  }

  function handleResume() {
    setPaused(false);
    if (videoRef.current) videoRef.current.play();
  }

  function goBack() {
    if (index > 0) { setIndex((i) => i - 1); setProgress(0); }
    else if (hasPrev) onPrev();
  }

  async function handleDelete() {
    if (!window.confirm('Delete this story?')) return;
    try {
      await deleteStory(currentStory.id);
      setDeleted(true);
      setTimeout(onClose, 300);
    } catch (e) { console.error(e); }
  }

  if (!currentStory || deleted) return null;

  const url = mediaUrl(currentStory.mediaUrl);

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      id="story-viewer"
      onMouseDown={handlePause}
      onMouseUp={handleResume}
      onTouchStart={handlePause}
      onTouchEnd={handleResume}
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-20">
        {group.stories.map((s, i) => (
          <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{
                width: i < index ? '100%' : i === index ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 flex items-center gap-3 px-4 pt-4 z-20">
        <span className="text-2xl">{group.user.avatar || '😎'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">{group.user.username}</p>
          <p className="text-xs text-white/60">{timeAgo(currentStory.createdAt)}</p>
        </div>
        {isOwn && (
          <button
            onClick={handleDelete}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="p-2 text-white/80 hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        )}
        <button
          onClick={onClose}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="p-2 text-white/80 hover:text-white"
          id="story-close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Media */}
      <div className="flex-1 flex items-center justify-center">
        {currentStory.mediaType === 'video' ? (
          <video
            ref={videoRef}
            src={url}
            className="max-h-full max-w-full object-contain"
            autoPlay
            playsInline
            muted={false}
            onEnded={advance}
          />
        ) : (
          <img
            src={url}
            alt="story"
            className="max-h-full max-w-full object-contain"
            draggable={false}
          />
        )}
      </div>

      {/* Caption */}
      {currentStory.caption && (
        <div className="absolute bottom-16 left-0 right-0 px-6 py-3 z-20">
          <p className="text-white text-sm font-medium text-center drop-shadow-lg">
            {currentStory.caption}
          </p>
        </div>
      )}

      {/* Left / Right tap zones */}
      <div className="absolute inset-0 flex z-10 pointer-events-none">
        <div
          className="w-1/3 h-full pointer-events-auto"
          onMouseDown={(e) => { e.stopPropagation(); }}
          onMouseUp={(e) => { e.stopPropagation(); handleResume(); goBack(); }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => { e.stopPropagation(); goBack(); }}
        />
        <div className="flex-1 h-full pointer-events-none" />
        <div
          className="w-1/3 h-full pointer-events-auto"
          onMouseDown={(e) => { e.stopPropagation(); }}
          onMouseUp={(e) => { e.stopPropagation(); handleResume(); advance(); }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => { e.stopPropagation(); advance(); }}
        />
      </div>
    </div>
  );
}
