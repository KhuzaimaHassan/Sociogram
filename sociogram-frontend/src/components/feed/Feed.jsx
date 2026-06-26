import { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import StoriesBar from './StoriesBar';
import PostCard from './PostCard';

import PostSkeleton from '../shared/PostSkeleton';

export default function Feed() {
  const { posts, feedLoading, feedError, feedHasMore, loadFeed, loadMoreFeed } = useApp();
  const sentinelRef = useRef(null);
  const feedPosts = posts.filter((p) => !p.isReel);

  useEffect(() => {
    if (!sentinelRef.current || !feedHasMore) return;
    const el = sentinelRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !feedLoading) loadMoreFeed();
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [feedHasMore, feedLoading, loadMoreFeed]);

  return (
    <div className="feed-container">
      <StoriesBar />

      {feedError && (
        <div className="mx-4 my-3 px-4 py-3 rounded-xl bg-accent-rose/10 border border-accent-rose/30 flex items-center justify-between">
          <span className="text-xs text-accent-rose">Couldn't load feed: {feedError}</span>
          <button
            onClick={() => loadFeed({ append: false })}
            className="text-xs font-medium text-white/80 hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      <div className="divide-y divide-dark-border/20">
        {feedPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {feedLoading && feedPosts.length === 0 && (
        <div className="divide-y divide-dark-border/20">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      )}

      {!feedLoading && feedPosts.length === 0 && !feedError && (
        <div className="py-16 text-center px-6">
          <div className="text-5xl mb-3">🌱</div>
          <p className="text-white font-semibold text-base">Your feed is empty</p>
          <p className="text-xs text-surface-400 mt-1">
            Follow creators on Explore to see their posts here, or share your first post.
          </p>
        </div>
      )}

      <div ref={sentinelRef} className="h-1" />

      {!feedHasMore && feedPosts.length > 0 && (
        <div className="py-12 text-center">
          <div className="inline-flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full border-2 border-dark-border flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-500">
                <circle cx="12" cy="12" r="10" />
                <path d="M16 12l-4 4-4-4M12 8v8" />
              </svg>
            </div>
            <p className="text-surface-500 text-sm">You're all caught up</p>
            <p className="text-surface-600 text-xs">You've seen all posts in your feed.</p>
          </div>
        </div>
      )}

      {feedLoading && feedPosts.length > 0 && (
        <div className="py-6 text-center">
          <div className="inline-block w-6 h-6 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
        </div>
      )}
    </div>
  );
}
