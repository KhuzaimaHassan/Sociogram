import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import * as postApi from '../services/postService';
import { mediaUrl } from '../services/apiClient';
import Avatar from '../components/shared/Avatar';

export default function SavedPosts() {
  const { user } = useAuth();
  const { updatePost } = useApp();
  const owner = user?.id;
  const [collection, setCollection] = useState({ owner, posts: [], nextCursor: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [removing, setRemoving] = useState({});
  const generation = useRef(0);
  const removalLocks = useRef(new Set());
  const pageLock = useRef(false);
  const current = collection.owner === owner ? collection : { posts: [], nextCursor: null };
  const busy = loading || collection.owner !== owner;
  const errorMessage = error?.owner === owner ? error.message : null;
  const hasPendingRemoval = current.posts.some(post => removing[`${owner}:${post.id}`]);

  useEffect(() => {
    const request = ++generation.current;
    pageLock.current = false;
    postApi.getSavedPosts().then(data => {
      if (request === generation.current) setCollection({ owner, posts: data.posts || [], nextCursor: data.nextCursor });
    }).catch(() => {
      if (request === generation.current) {
        setCollection({ owner, posts: [], nextCursor: null });
        setError({ owner, message: 'Could not load saved posts. Please try again.' });
      }
    }).finally(() => {
      if (request === generation.current) setLoading(false);
    });
    return () => { generation.current += 1; };
  }, [owner, attempt]);

  async function loadMore() {
    if (pageLock.current || busy || hasPendingRemoval || !current.nextCursor) return;
    pageLock.current = true;
    const request = generation.current;
    setLoading(true);
    setError(null);
    try {
      const data = await postApi.getSavedPosts({ cursor: current.nextCursor });
      if (request !== generation.current) return;
      setCollection(previous => ({
        owner,
        posts: [...new Map([...previous.posts, ...(data.posts || [])].map(post => [post.id, post])).values()],
        nextCursor: data.nextCursor,
      }));
    } catch {
      if (request === generation.current) setError({ owner, message: 'Could not load more saved posts. Please try again.' });
    } finally {
      if (request === generation.current) {
        pageLock.current = false;
        setLoading(false);
      }
    }
  }

  async function remove(postId) {
    const request = generation.current;
    const lock = `${request}:${postId}`;
    if (removalLocks.current.has(lock)) return;
    removalLocks.current.add(lock);
    const key = `${owner}:${postId}`;
    setRemoving(previous => ({ ...previous, [key]: true }));
    setError(null);
    try {
      await postApi.unsavePost(postId);
      if (request !== generation.current) return;
      setCollection(previous => ({ ...previous, posts: previous.posts.filter(post => post.id !== postId) }));
      updatePost(postId, { saved: false });
    } catch {
      if (request === generation.current) setError({ owner, message: 'Could not remove this saved post. Please try again.' });
    } finally {
      removalLocks.current.delete(lock);
      setRemoving(previous => ({ ...previous, [key]: false }));
    }
  }

  return (
    <div className="feed-container pb-8">
      <header className="px-4 py-5 border-b border-dark-border/30">
        <Link to="/profile" className="text-sm text-brand-300 hover:text-white">← Back to profile</Link>
        <h1 className="mt-3 text-xl font-bold text-white">Saved posts</h1>
        <p className="mt-1 text-sm text-surface-400">Only you can see this collection.</p>
      </header>
      {errorMessage && (
        <div role="alert" className="m-4 rounded-xl border border-accent-rose/30 bg-accent-rose/10 p-3 text-sm text-white">
          <p>{errorMessage}</p>
          <button disabled={hasPendingRemoval} className="mt-2 font-semibold underline disabled:opacity-50" onClick={() => { setLoading(true); setError(null); setAttempt(value => value + 1); }}>Retry</button>
        </div>
      )}
      {current.posts.map(post => {
        const url = mediaUrl(post.mediaUrl);
        return (
          <article key={post.id} data-testid={`saved-post-${post.id}`} className="border-b border-dark-border/30">
            <div className="flex items-center gap-3 px-4 py-3">
              <Avatar emoji={post.user?.avatar || '😎'} size="sm" />
              <Link className="min-w-0 flex-1 break-words text-sm font-semibold text-white" to={`/profile/${post.user.username}`}>{post.user.username}</Link>
              <button
                className="rounded-lg border border-dark-border/50 px-3 py-2 text-xs text-white disabled:opacity-50"
                disabled={busy || !!removing[`${owner}:${post.id}`]}
                aria-label={`Remove saved post: ${(post.caption || post.user.username).slice(0, 80)}`}
                onClick={() => remove(post.id)}
              >{removing[`${owner}:${post.id}`] ? 'Removing…' : 'Remove'}</button>
            </div>
            {url && (post.mediaType === 'video'
              ? <video src={url} controls playsInline preload="metadata" className="aspect-square w-full object-contain bg-black" />
              : <img src={url} alt={(post.caption || 'Saved post').slice(0, 140)} loading="lazy" className="aspect-square w-full object-cover" />)}
            {post.caption && <p className="px-4 pb-4 text-sm text-surface-200 whitespace-pre-wrap break-words">{post.caption}</p>}
          </article>
        );
      })}
      {busy && <p role="status" className="px-4 py-6 text-center text-sm text-surface-400">Loading saved posts…</p>}
      {!busy && !errorMessage && !current.posts.length && !current.nextCursor && (
        <div className="px-6 py-16 text-center">
          <h2 className="text-lg font-semibold text-white">No saved posts yet</h2>
          <p className="mt-2 text-sm text-surface-400">Tap the bookmark on a post to keep it here.</p>
          <Link to="/" className="mt-4 inline-block text-sm text-brand-300">Browse your feed</Link>
        </div>
      )}
      {current.nextCursor && <button disabled={busy || hasPendingRemoval} onClick={loadMore} className="mx-auto my-5 block rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Load more</button>}
    </div>
  );
}
