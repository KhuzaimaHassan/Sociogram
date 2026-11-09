import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import * as postApi from '../services/postService';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

const initialState = {
  posts: [],
  feedLoading: false,
  feedError: null,
  feedCursor: null,
  feedHasMore: true,
  toasts: [],
  savingPostIds: {},
};

function appReducer(state, action) {
  switch (action.type) {
    case 'FEED_LOAD_START':
      return { ...state, feedLoading: true, feedError: null };

    case 'FEED_LOAD_SUCCESS': {
      const { posts, nextCursor, append } = action;
      return {
        ...state,
        posts: append ? [...state.posts, ...posts] : posts,
        feedCursor: nextCursor,
        feedHasMore: !!nextCursor,
        feedLoading: false,
        feedError: null,
      };
    }

    case 'FEED_LOAD_FAILURE':
      return { ...state, feedLoading: false, feedError: action.error };

    case 'FEED_RESET':
      return { ...state, posts: [], feedCursor: null, feedHasMore: true, feedError: null, savingPostIds: {} };

    case 'SAVE_PENDING':
      return { ...state, savingPostIds: { ...state.savingPostIds, [action.postId]: action.pending } };

    case 'PATCH_POST': {
      const { postId, patch } = action;
      return {
        ...state,
        posts: state.posts.map((p) => (p.id === postId ? { ...p, ...patch } : p)),
      };
    }

    case 'PREPEND_POST':
      return { ...state, posts: [action.post, ...state.posts] };

    case 'REMOVE_POST':
      return { ...state, posts: state.posts.filter((p) => p.id !== action.postId) };

    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.toast] };

    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.toastId) };

    default:
      return state;
  }
}

/** Adjust local reaction map when a user picks/clears a reaction. */
function adjustReactions(reactions, prevEmoji, nextEmoji) {
  const next = { ...(reactions || {}) };
  if (prevEmoji) {
    const c = (next[prevEmoji] || 1) - 1;
    if (c <= 0) delete next[prevEmoji];
    else next[prevEmoji] = c;
  }
  if (nextEmoji) {
    next[nextEmoji] = (next[nextEmoji] || 0) + 1;
  }
  return next;
}

export function AppProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [state, dispatch] = useReducer(appReducer, initialState);
  const loadingRef = useRef(false);
  const accountGeneration = useRef(0);
  const saveLocks = useRef(new Set());

  // ── Feed ─────────────────────────────────────────────────
  const loadFeed = useCallback(async ({ append = false } = {}) => {
    if (loadingRef.current) return;
    const generation = accountGeneration.current;
    loadingRef.current = true;
    dispatch({ type: 'FEED_LOAD_START' });
    try {
      const cursor = append ? state.feedCursor : undefined;
      const data = await postApi.getFeed({ cursor });
      if (generation !== accountGeneration.current) return;
      dispatch({
        type: 'FEED_LOAD_SUCCESS',
        posts: data.posts || [],
        nextCursor: data.nextCursor,
        append,
      });
    } catch (err) {
      if (generation !== accountGeneration.current) return;
      // Show error state — user can press Retry
      dispatch({ type: 'FEED_LOAD_FAILURE', error: err.message });
    } finally {
      if (generation === accountGeneration.current) loadingRef.current = false;
    }
  }, [state.feedCursor]);

  useEffect(() => {
    accountGeneration.current += 1;
    saveLocks.current.clear();
    loadingRef.current = false;
    if (isAuthenticated) {
      dispatch({ type: 'FEED_RESET' });
      loadFeed({ append: false });
    } else {
      dispatch({ type: 'FEED_RESET' });
    }
    return () => { accountGeneration.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  // ── Likes ────────────────────────────────────────────────
  const toggleLike = useCallback(async (postId) => {
    const post = state.posts.find((p) => p.id === postId);
    if (!post) return;
    const wasLiked = !!post.liked;
    const optimistic = {
      liked: !wasLiked,
      likes: Math.max(0, (post.likes || 0) + (wasLiked ? -1 : 1)),
    };
    dispatch({ type: 'PATCH_POST', postId, patch: optimistic });
    try {
      const result = wasLiked
        ? await postApi.unlikePost(postId)
        : await postApi.likePost(postId);
      dispatch({
        type: 'PATCH_POST',
        postId,
        patch: { liked: !!result.liked, likes: result.likes ?? optimistic.likes },
      });
    } catch (err) {
      dispatch({ type: 'PATCH_POST', postId, patch: { liked: wasLiked, likes: post.likes } });
      console.warn('[Sociogram] Failed to toggle like:', err.message);
    }
  }, [state.posts]);

  // ── Reactions ────────────────────────────────────────────
  const addReaction = useCallback(async (postId, emoji, source = 'manual') => {
    const post = state.posts.find((p) => p.id === postId);
    if (!post) return;
    const prevEmoji = post.myReaction || null;
    const optimisticReactions = adjustReactions(post.reactions, prevEmoji, emoji);
    dispatch({
      type: 'PATCH_POST',
      postId,
      patch: { reactions: optimisticReactions, myReaction: emoji, reactionSource: source },
    });
    try {
      const result = await postApi.reactToPost(postId, { emoji, source });
      dispatch({
        type: 'PATCH_POST',
        postId,
        patch: { reactions: result.reactions || optimisticReactions, myReaction: result.myReaction || emoji },
      });
    } catch (err) {
      dispatch({
        type: 'PATCH_POST',
        postId,
        patch: { reactions: post.reactions, myReaction: prevEmoji },
      });
      console.warn('[Sociogram] Failed to add reaction:', err.message);
    }
  }, [state.posts]);

  const removeReaction = useCallback(async (postId) => {
    const post = state.posts.find((p) => p.id === postId);
    if (!post || !post.myReaction) return;
    const prevEmoji = post.myReaction;
    const optimisticReactions = adjustReactions(post.reactions, prevEmoji, null);
    dispatch({
      type: 'PATCH_POST',
      postId,
      patch: { reactions: optimisticReactions, myReaction: null, reactionSource: null },
    });
    try {
      const result = await postApi.clearReaction(postId);
      dispatch({
        type: 'PATCH_POST',
        postId,
        patch: { reactions: result.reactions || optimisticReactions, myReaction: null },
      });
    } catch (err) {
      dispatch({
        type: 'PATCH_POST',
        postId,
        patch: { reactions: post.reactions, myReaction: prevEmoji },
      });
      console.warn('[Sociogram] Failed to clear reaction:', err.message);
    }
  }, [state.posts]);

  // ── Posts CRUD ───────────────────────────────────────────
  const addPostToFeed = useCallback((post) => {
    dispatch({ type: 'PREPEND_POST', post });
  }, []);

  const removePostFromFeed = useCallback((postId) => {
    dispatch({ type: 'REMOVE_POST', postId });
  }, []);

  const updatePost = useCallback((postId, patch) => {
    dispatch({ type: 'PATCH_POST', postId, patch });
  }, []);

  // ── Toasts ───────────────────────────────────────────────
  const showToast = useCallback((message, options = {}) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      duration: options.duration || 3000,
      onUndo: options.onUndo || null,
      ...options,
    };
    dispatch({ type: 'ADD_TOAST', toast });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', toastId: id }), toast.duration);
    return id;
  }, []);

  const dismissToast = useCallback((toastId) => {
    dispatch({ type: 'REMOVE_TOAST', toastId });
  }, []);

  const toggleSave = useCallback(async (postId) => {
    const post = state.posts.find(p => p.id === postId);
    const generation = accountGeneration.current;
    const lock = `${generation}:${postId}`;
    if (!post || saveLocks.current.has(lock)) return;
    saveLocks.current.add(lock);
    const wasSaved = !!post.saved;
    dispatch({ type: 'SAVE_PENDING', postId, pending: true });
    dispatch({ type: 'PATCH_POST', postId, patch: { saved: !wasSaved } });
    try {
      const result = await (wasSaved ? postApi.unsavePost(postId) : postApi.savePost(postId));
      if (generation === accountGeneration.current) {
        dispatch({ type: 'PATCH_POST', postId, patch: { saved: !!result.saved } });
      }
    } catch {
      if (generation === accountGeneration.current) {
        dispatch({ type: 'PATCH_POST', postId, patch: { saved: wasSaved } });
        showToast('Could not update saved posts. Please try again.');
      }
    } finally {
      saveLocks.current.delete(lock);
      if (generation === accountGeneration.current) dispatch({ type: 'SAVE_PENDING', postId, pending: false });
    }
  }, [state.posts, showToast]);

  const value = {
    posts: state.posts,
    feedLoading: state.feedLoading,
    feedError: state.feedError,
    feedHasMore: state.feedHasMore,
    toasts: state.toasts,
    savingPostIds: state.savingPostIds,

    loadFeed,
    loadMoreFeed: () => loadFeed({ append: true }),
    toggleLike,
    toggleSave,
    addReaction,
    removeReaction,
    addPostToFeed,
    removePostFromFeed,
    updatePost,
    showToast,
    dismissToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export default AppContext;
