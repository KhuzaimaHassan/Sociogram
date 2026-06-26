import { useState, useCallback, useMemo } from 'react';
import Avatar from '../shared/Avatar';
import DwellBar from '../reactions/DwellBar';
import ReactionChip from '../reactions/ReactionChip';
import ReactionPicker from '../reactions/ReactionPicker';
import CommentsSheet from './CommentsSheet';
import { useDwell } from '../../hooks/useDwell';
import { useFaceExpression } from '../../hooks/useFaceExpression';
import { useApp } from '../../context/AppContext';
import { expressionToEmoji } from '../../utils/expressionToEmoji';
import { formatRelativeTime, formatCount } from '../../utils/formatTime';
import { mediaUrl } from '../../services/apiClient';
import { getPostVisual } from '../../utils/postVisual';

export default function PostCard({ post }) {
  const { toggleLike, toggleSave, addReaction, removeReaction, showToast, updatePost } = useApp();
  const { isEnabled, detectExpression } = useFaceExpression();
  const [showPicker, setShowPicker] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Normalize fields so this works for backend shape AND legacy mock shape.
  const username = post.user?.username || post.userId || 'someone';
  const avatar = post.user?.avatar || post.avatar || '😎';
  const timestamp = post.createdAt
    ? formatRelativeTime(post.createdAt)
    : post.timestamp || '';
  const resolvedMediaUrl = mediaUrl(post.mediaUrl);
  // Deterministic visual for posts without real media
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
  });

  const handleDoubleTap = () => {
    if (!post.liked) toggleLike(post.id);
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 800);
  };

  const handleManualReaction = (emoji) => {
    if (post.myReaction === emoji) {
      removeReaction(post.id);
    } else {
      addReaction(post.id, emoji, 'manual');
    }
    setShowPicker(false);
  };

  const reactionEntries = useMemo(
    () => Object.entries(post.reactions || {}).filter(([, c]) => c > 0),
    [post.reactions]
  );
  const captionTruncated = post.caption && post.caption.length > 80 && !showFullCaption;

  return (
    <article className="border-b border-dark-border/30 animate-fade-in" id={`post-${post.id}`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar emoji={avatar} size="md" hasStory viewed={false} />
          <div>
            <p className="text-sm font-semibold text-white">{username}</p>
            {post.location && (
              <p className="text-[11px] text-surface-400">{post.location}</p>
            )}
          </div>
        </div>
        <button className="action-btn" id={`post-more-${post.id}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-white/60">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      <div
        ref={dwellRef}
        className="relative w-full aspect-square cursor-pointer overflow-hidden"
        onDoubleClick={handleDoubleTap}
      >
        {resolvedMediaUrl ? (
          post.mediaType === 'video' ? (
            <video
              src={resolvedMediaUrl}
              className="w-full h-full object-cover bg-black"
              muted
              loop
              playsInline
              autoPlay
            />
          ) : (
            <img src={resolvedMediaUrl} alt={post.caption || 'post media'} className="w-full h-full object-cover" />
          )
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: visual?.gradient || post.mediaBg || 'linear-gradient(135deg, #1a1a2e, #2d1b69)' }}
          >
            <span className="text-8xl select-none drop-shadow-lg animate-float">
              {visual?.emoji || post.mediaEmoji || '🌐'}
            </span>
          </div>
        )}

        {heartAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-7xl animate-scale-bounce drop-shadow-lg">❤️</span>
          </div>
        )}

        <DwellBar progress={dwellProgress} isDwelling={isDwelling} />
      </div>

      <div className="px-4 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => toggleLike(post.id)}
              className={`action-btn ${post.liked ? 'text-accent-rose' : 'text-white/80'}`}
              id={`like-${post.id}`}
            >
              <svg
                width="24" height="24" viewBox="0 0 24 24"
                fill={post.liked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={post.liked ? 'animate-heart-pop' : ''}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>

            <button
              className="action-btn text-white/80"
              id={`comment-${post.id}`}
              onClick={() => setShowComments(true)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>

            <button className="action-btn text-white/80" id={`share-${post.id}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowPicker(!showPicker)}
                className="action-btn text-white/80"
                id={`react-${post.id}`}
              >
                {post.myReaction ? (
                  <span className="text-xl">{post.myReaction}</span>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
                )}
              </button>
              {showPicker && (
                <ReactionPicker
                  onSelect={handleManualReaction}
                  onClose={() => setShowPicker(false)}
                  currentReaction={post.myReaction}
                />
              )}
            </div>
          </div>

          <button
            onClick={() => toggleSave(post.id)}
            className={`action-btn ${post.saved ? 'text-white' : 'text-white/80'}`}
            id={`save-${post.id}`}
          >
            <svg
              width="22" height="22" viewBox="0 0 24 24"
              fill={post.saved ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>

        <p className="text-sm font-semibold text-white mt-2">
          {formatCount(post.likes || 0)} likes
        </p>

        {reactionEntries.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {reactionEntries.map(([emoji, count]) => (
              <ReactionChip
                key={emoji}
                emoji={emoji}
                count={count}
                isActive={post.myReaction === emoji}
                onClick={() => handleManualReaction(emoji)}
              />
            ))}
          </div>
        )}

        {post.caption && (
          <p className="text-sm text-white/90 mt-2">
            <span className="font-semibold mr-1.5">{username}</span>
            {captionTruncated ? (
              <>
                {post.caption.slice(0, 80)}...
                <button
                  onClick={() => setShowFullCaption(true)}
                  className="text-surface-400 ml-1 text-xs"
                >
                  more
                </button>
              </>
            ) : (
              post.caption
            )}
          </p>
        )}

        {(post.comments || 0) > 0 && (
          <button
            className="text-sm text-surface-400 mt-1"
            id={`view-comments-${post.id}`}
            onClick={() => setShowComments(true)}
          >
            View all {post.comments} comments
          </button>
        )}

        <p className="text-[10px] text-surface-500 mt-1.5 pb-3 uppercase tracking-wide">
          {timestamp}
        </p>
      </div>

      <CommentsSheet
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        postId={post.id}
        onCountChange={(count) => updatePost(post.id, { comments: count })}
      />
    </article>
  );
}
