import { useState, useCallback } from 'react';
import Avatar from '../shared/Avatar';
import DwellBar from '../reactions/DwellBar';
import { useDwell } from '../../hooks/useDwell';
import { useFaceExpression } from '../../hooks/useFaceExpression';
import { useApp } from '../../context/AppContext';
import { expressionToEmoji } from '../../utils/expressionToEmoji';
import { mediaUrl } from '../../services/apiClient';
import { formatCount } from '../../utils/formatTime';
import { getPostVisual } from '../../utils/postVisual';

export default function ReelCard({ post }) {
  const { toggleLike, addReaction, removeReaction, showToast } = useApp();
  const { isEnabled, detectExpression } = useFaceExpression();
  const [heartAnim, setHeartAnim] = useState(false);

  const username = post.user?.username || post.userId || 'someone';
  const avatar = post.user?.avatar || post.avatar || '😎';
  const resolvedMediaUrl = mediaUrl(post.mediaUrl);
  const visual = resolvedMediaUrl ? null : getPostVisual(post);

  const handleDwellComplete = useCallback(async () => {
    if (!isEnabled) return;
    const expression = await detectExpression();
    if (!expression) return;
    const emoji = expressionToEmoji(expression);
    if (!emoji) return;

    addReaction(post.id, emoji, 'expression');
    showToast(`${emoji} Reaction captured!`, {
      duration: 3000,
      onUndo: () => removeReaction(post.id),
    });
  }, [isEnabled, detectExpression, post.id, addReaction, removeReaction, showToast]);

  const { dwellProgress, isDwelling, ref: dwellRef } = useDwell({
    postId: post.id,
    onDwellComplete: handleDwellComplete,
    threshold: 0.7,
  });

  const handleDoubleTap = () => {
    if (!post.liked) toggleLike(post.id);
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 800);
  };

  const totalReactions = Object.values(post.reactions || {}).reduce((a, b) => a + b, 0);

  return (
    <div
      ref={dwellRef}
      className="snap-start relative w-full h-screen flex-shrink-0 overflow-hidden"
      onDoubleClick={handleDoubleTap}
      id={`reel-${post.id}`}
    >
      {/* Background */}
      {resolvedMediaUrl ? (
        post.mediaType === 'video' ? (
          <video
            src={resolvedMediaUrl}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <img src={resolvedMediaUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )
      ) : (
        <div className="absolute inset-0" style={{ background: visual?.gradient || post.mediaBg || '#1a1a2e' }} />
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

      {/* Center emoji (only when no media) */}
      {!resolvedMediaUrl && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[120px] select-none drop-shadow-2xl animate-float">
            {visual?.emoji || post.mediaEmoji || '🎬'}
          </span>
        </div>
      )}

      {/* Double-tap heart */}
      {heartAnim && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <span className="text-8xl animate-scale-bounce drop-shadow-lg">❤️</span>
        </div>
      )}

      {/* Right sidebar actions */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
        {/* Like */}
        <button
          onClick={() => toggleLike(post.id)}
          className="flex flex-col items-center gap-1"
          id={`reel-like-${post.id}`}
        >
          <div className={`p-2 rounded-full ${post.liked ? 'text-accent-rose' : 'text-white'}`}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill={post.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" className={post.liked ? 'animate-heart-pop' : ''}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <span className="text-white text-xs font-medium text-shadow-sm">{formatCount(post.likes)}</span>
        </button>

        {/* Comment */}
        <button className="flex flex-col items-center gap-1" id={`reel-comment-${post.id}`}>
          <div className="p-2 text-white">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span className="text-white text-xs font-medium text-shadow-sm">{post.comments}</span>
        </button>

        {/* Reactions */}
        <button className="flex flex-col items-center gap-1">
          <div className="p-2 text-white">
            {post.myReaction ? (
              <span className="text-2xl">{post.myReaction}</span>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            )}
          </div>
          <span className="text-white text-xs font-medium text-shadow-sm">{totalReactions}</span>
        </button>

        {/* Share */}
        <button className="flex flex-col items-center gap-1" id={`reel-share-${post.id}`}>
          <div className="p-2 text-white">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </div>
          <span className="text-white text-xs font-medium text-shadow-sm">Share</span>
        </button>

        {/* Music disc */}
        <div className="w-9 h-9 rounded-lg bg-dark-elevated/60 border border-white/20 flex items-center justify-center animate-pulse">
          <span className="text-lg">🎵</span>
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-6 left-4 right-16 z-10">
        <div className="flex items-center gap-3 mb-3">
          <Avatar emoji={avatar} size="md" />
          <span className="text-white font-semibold text-sm text-shadow-md">{username}</span>
          <button className="px-3 py-1 rounded-lg border border-white/30 text-white text-xs font-medium hover:bg-white/10 transition-colors">
            Follow
          </button>
        </div>
        <p className="text-white/90 text-sm text-shadow-sm line-clamp-2">
          {post.caption}
        </p>
        {post.location && (
          <p className="text-white/50 text-xs mt-1 text-shadow-sm">📍 {post.location}</p>
        )}
      </div>

      {/* Dwell bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <DwellBar progress={dwellProgress} isDwelling={isDwelling} />
      </div>
    </div>
  );
}
