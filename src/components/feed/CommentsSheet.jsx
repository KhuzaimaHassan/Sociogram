import { useEffect, useState, useRef, useCallback } from 'react';
import * as postApi from '../../services/postService';
import Avatar from '../shared/Avatar';
import { formatRelativeTime } from '../../utils/formatTime';
import { useAuth } from '../../context/AuthContext';

export default function CommentsSheet({ isOpen, onClose, postId, onCountChange }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await postApi.getComments(postId, { limit: 50 });
      setComments(data.comments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (isOpen) {
      refresh();
      const t = setTimeout(() => inputRef.current?.focus(), 200);
      document.body.style.overflow = 'hidden';
      return () => {
        clearTimeout(t);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, refresh]);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const newComment = await postApi.addComment(postId, trimmed);
      setComments((prev) => [newComment, ...prev]);
      setText('');
      onCountChange?.(comments.length + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId) {
    try {
      await postApi.deleteComment(commentId);
      setComments((prev) => {
        const next = prev.filter((c) => c.id !== commentId);
        onCountChange?.(next.length);
        return next;
      });
    } catch (err) {
      setError(err.message);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="relative w-full sm:max-w-md glass rounded-t-3xl sm:rounded-2xl shadow-2xl animate-scale-in overflow-hidden flex flex-col" style={{ maxHeight: '85vh' }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-dark-border/50">
          <div className="w-9 h-1 bg-surface-600/60 rounded-full sm:hidden absolute left-1/2 top-2 -translate-x-1/2" />
          <h2 className="text-sm font-semibold text-white">Comments</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-surface-400"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading && (
            <div className="text-center text-xs text-surface-400 py-8">Loading comments…</div>
          )}
          {!loading && comments.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-sm text-surface-300">No comments yet</p>
              <p className="text-xs text-surface-500">Be the first to share what you think.</p>
            </div>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-3">
              <Avatar emoji={c.user?.avatar || '😎'} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/90">
                  <span className="font-semibold mr-1.5">{c.user?.username || 'someone'}</span>
                  {c.text}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] uppercase tracking-wide text-surface-500">
                    {formatRelativeTime(c.createdAt)}
                  </span>
                  {user && c.user?.id === user.id && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-[10px] uppercase tracking-wide text-accent-rose/80 hover:text-accent-rose"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-accent-rose/10 border border-accent-rose/30 text-xs text-accent-rose">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="border-t border-dark-border/50 p-3 flex items-center gap-2">
          <Avatar emoji={user?.avatar || '😎'} size="sm" />
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            maxLength={500}
            className="flex-1 px-3 py-2 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
          />
          <button
            type="submit"
            disabled={!text.trim() || submitting}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-accent-pink text-white text-xs font-semibold disabled:opacity-40 transition-all"
          >
            {submitting ? '…' : 'Post'}
          </button>
        </form>
      </div>
    </div>
  );
}
