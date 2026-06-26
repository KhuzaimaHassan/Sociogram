/**
 * Messages.jsx — DM inbox: list of conversations with last message preview
 * and unread badges. Clicking opens the Chat page.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getConversations, getOrCreateConversation } from '../services/dmService';
import * as userApi from '../services/userService';

function timeAgo(ts) {
  if (!ts) return '';
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 60) return 'now';
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

export default function Messages() {
  const { user } = useAuth();
  const { socket, notifications } = useSocket();
  const navigate = useNavigate();

  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const loadConvs = useCallback(async () => {
    try {
      const data = await getConversations();
      setConvs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConvs(); }, [loadConvs]);

  // Refresh conversation list when a new DM notification arrives
  useEffect(() => {
    const last = notifications[0];
    if (last?.type === 'message') loadConvs();
  }, [notifications, loadConvs]);

  // Live update: socket 'message:new' while on inbox page
  useEffect(() => {
    if (!socket) return;
    function onNew() { loadConvs(); }
    socket.on('message:new', onNew);
    return () => socket.off('message:new', onNew);
  }, [socket, loadConvs]);

  // User search for new conversation
  useEffect(() => {
    if (search.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await userApi.searchUsers(search);
        const users = res?.data ?? res ?? [];
        setSearchResults(Array.isArray(users) ? users.filter((u) => u.id !== user.id) : []);
      } catch (_) {}
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [search, user.id]);

  async function openOrCreate(userId) {
    try {
      const conv = await getOrCreateConversation(userId);
      navigate(`/messages/${conv.id}`);
    } catch (e) { console.error(e); }
  }

  const filtered = convs.filter((c) =>
    c.other.username.toLowerCase().includes(search.toLowerCase()) ||
    (c.other.displayName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 glass-elevated border-b border-dark-border/30 px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold text-white mb-3">Messages</h1>

        {/* Search / New conversation */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search or start new chat…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-dark-border/30 text-white text-sm placeholder-surface-500 focus:outline-none focus:border-brand-500/50 transition-colors"
            id="messages-search"
          />
        </div>

        {/* Search results — new conversation */}
        {search.length >= 2 && (
          <div className="mt-2 rounded-xl bg-dark-surface border border-dark-border/30 overflow-hidden">
            {searching && (
              <p className="text-xs text-surface-400 px-3 py-3">Searching…</p>
            )}
            {!searching && searchResults.length === 0 && (
              <p className="text-xs text-surface-400 px-3 py-3">No users found</p>
            )}
            {searchResults.map((u) => (
              <button
                key={u.id}
                onClick={() => openOrCreate(u.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
              >
                <span className="text-2xl">{u.avatar || '😎'}</span>
                <div>
                  <p className="text-sm font-medium text-white">{u.displayName || u.username}</p>
                  <p className="text-xs text-surface-400">@{u.username}</p>
                </div>
                <span className="ml-auto text-xs text-brand-400">Message →</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && search.length < 2 && (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <span className="text-5xl mb-4">💬</span>
            <h2 className="text-lg font-semibold text-white mb-1">No messages yet</h2>
            <p className="text-sm text-surface-400">
              Search for someone above to start a conversation
            </p>
          </div>
        )}

        {filtered.map((conv) => {
          const isUnread = conv.unreadCount > 0;
          return (
            <button
              key={conv.id}
              onClick={() => navigate(`/messages/${conv.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 active:bg-white/10 transition-colors border-b border-dark-border/20 text-left"
              id={`conv-${conv.id}`}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <span className="text-3xl">{conv.other.avatar || '😎'}</span>
                {isUnread && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-500 rounded-full border-2 border-dark-bg" />
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-${isUnread ? 'semibold' : 'medium'} text-white truncate`}>
                    {conv.other.displayName || conv.other.username}
                  </p>
                  <span className="text-xs text-surface-400 shrink-0 ml-2">
                    {timeAgo(conv.lastMessage?.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <p className={`text-xs truncate ${isUnread ? 'text-white' : 'text-surface-400'}`}>
                    {conv.lastMessage
                      ? (conv.lastMessage.senderId === user.id ? 'You: ' : '') + conv.lastMessage.text
                      : 'Say hello 👋'}
                  </p>
                  {isUnread && (
                    <span className="shrink-0 ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-500 text-white">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
