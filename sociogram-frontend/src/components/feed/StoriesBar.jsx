/**
 * StoriesBar.jsx — Real stories from the API.
 *
 * Features:
 * - Loads grouped stories from /api/stories
 * - Gradient ring = has unread stories; grey ring = all seen
 * - "Your Story" opens StoryCreator; others open StoryViewer
 * - Supports navigating between user groups in the viewer
 * - Refreshes after creating a new story
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStories } from '../../services/storyService';
import StoryViewer from './StoryViewer';
import StoryCreator from './StoryCreator';

export default function StoriesBar() {
  const { user: me } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingIndex, setViewingIndex] = useState(null); // index into groups[]
  const [showCreator, setShowCreator] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getStories();
      setGroups(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openGroup(idx) { setViewingIndex(idx); }
  function closeViewer() { setViewingIndex(null); load(); } // refresh seen state

  function handleCreated() { load(); }

  // Find my own group to show "active story" indicator on my bubble
  const myGroup = groups.find((g) => g.user.id === me?.id);
  const hasMyStory = myGroup && myGroup.stories.length > 0;

  const displayGroups = groups.filter((g) => g.user.id !== me?.id);

  return (
    <>
      <div className="glass-elevated border-b border-dark-border/30 py-3" id="stories-bar">
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-4">

          {/* ── Your Story bubble ── */}
          <button
            onClick={() => hasMyStory ? openGroup(groups.findIndex(g => g.user.id === me?.id)) : setShowCreator(true)}
            className="flex flex-col items-center gap-1.5 min-w-[64px] group"
            id="stories-own"
          >
            <div className="relative">
              {/* Ring: gradient if you have a story, plain border if not */}
              {hasMyStory ? (
                <div className="story-ring p-[2.5px] rounded-full">
                  <div className="bg-dark-bg rounded-full p-0.5">
                    <div className="w-14 h-14 rounded-full bg-dark-elevated flex items-center justify-center text-2xl">
                      {me?.avatar || '😎'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-dark-elevated border-2 border-dark-border/50 flex items-center justify-center text-2xl">
                  {me?.avatar || '😎'}
                </div>
              )}
              {/* + badge */}
              {!hasMyStory && (
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center border-2 border-dark-bg group-hover:bg-brand-400 transition-colors">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
              )}
            </div>
            <span className="text-[11px] text-white/60 truncate w-16 text-center leading-tight">
              {hasMyStory ? 'Your Story' : 'Add Story'}
            </span>
          </button>

          {/* ── Loading skeletons ── */}
          {loading && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 min-w-[64px]">
              <div className="w-14 h-14 rounded-full bg-dark-elevated/60 animate-pulse" />
              <div className="w-10 h-2 rounded bg-dark-elevated/60 animate-pulse" />
            </div>
          ))}

          {/* ── Friend story bubbles ── */}
          {!loading && displayGroups.map((group, rawIdx) => {
            // index in the full groups array
            const fullIdx = groups.indexOf(group);
            const hasUnread = group.hasUnread;

            return (
              <button
                key={group.user.id}
                onClick={() => openGroup(fullIdx)}
                className="flex flex-col items-center gap-1.5 min-w-[64px] group"
              >
                <div className="relative">
                  {hasUnread ? (
                    <div className="story-ring p-[2.5px] rounded-full">
                      <div className="bg-dark-bg rounded-full p-0.5">
                        <div className="w-14 h-14 rounded-full bg-dark-elevated flex items-center justify-center text-2xl">
                          {group.user.avatar || '😎'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-dark-elevated border-2 border-surface-600/40 flex items-center justify-center text-2xl opacity-70">
                      {group.user.avatar || '😎'}
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-white/60 truncate w-16 text-center group-hover:text-white/90 transition-colors leading-tight">
                  {group.user.username.split('.')[0]}
                </span>
              </button>
            );
          })}

          {/* ── Empty state when no stories ── */}
          {!loading && displayGroups.length === 0 && (
            <div className="flex items-center pl-2">
              <p className="text-xs text-surface-500">
                No stories yet — follow people or create your first!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Story Viewer ── */}
      {viewingIndex !== null && groups[viewingIndex] && (
        <StoryViewer
          group={groups[viewingIndex]}
          onClose={closeViewer}
          onNext={() => {
            const next = viewingIndex + 1;
            if (next < groups.length) setViewingIndex(next);
            else closeViewer();
          }}
          onPrev={() => {
            const prev = viewingIndex - 1;
            if (prev >= 0) setViewingIndex(prev);
            else closeViewer();
          }}
          hasNext={viewingIndex < groups.length - 1}
          hasPrev={viewingIndex > 0}
        />
      )}

      {/* ── Story Creator ── */}
      {showCreator && (
        <StoryCreator
          onClose={() => setShowCreator(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
