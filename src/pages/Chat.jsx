/**
 * Chat.jsx — Real-time DM conversation view.
 *
 * Features:
 * - Load message history (paginated on scroll-up)
 * - Real-time new messages via socket 'message:new'
 * - Typing indicator (debounced emit + show partner's indicator)
 * - Read receipts — messages marked read on open
 * - Emoji keyboard shortcut picker (7 common emojis)
 * - Auto-scroll to bottom on new message
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getMessages, sendMessage } from '../services/dmService';
import { getOrCreateConversation } from '../services/dmService';

const QUICK_EMOJIS = ['❤️', '😂', '😍', '😮', '👏', '🔥', '✨'];

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateHeader(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function Chat() {
  const { convId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [other, setOther] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const isTyping = useRef(false);
  const inputRef = useRef(null);

  // Load conversation metadata + initial messages
  useEffect(() => {
    async function load() {
      try {
        const [msgData] = await Promise.all([
          getMessages(convId),
        ]);
        setMessages(msgData.messages);
        setNextCursor(msgData.nextCursor);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [convId]);

  // Join socket room for this conversation
  useEffect(() => {
    if (!socket) return;
    socket.emit('join:conv', convId);

    function onNewMessage({ message, conversationId }) {
      if (conversationId !== convId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      // Stop typing indicator when a message arrives
      setTypingUser(null);
    }

    function onTypingStart({ userId, username }) {
      if (userId !== user.id) setTypingUser(username);
    }

    function onTypingStop({ userId }) {
      if (userId !== user.id) setTypingUser(null);
    }

    socket.on('message:new', onNewMessage);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);

    return () => {
      socket.emit('leave:conv', convId);
      socket.off('message:new', onNewMessage);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
    };
  }, [socket, convId, user.id]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (!loading) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Extract 'other' participant from messages
  useEffect(() => {
    if (!other && messages.length > 0) {
      const msg = messages.find((m) => m.sender.id !== user.id);
      if (msg) setOther(msg.sender);
    }
  }, [messages, other, user.id]);

  // Load older messages on scroll to top
  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await getMessages(convId, nextCursor);
      setMessages((prev) => [...data.messages, ...prev]);
      setNextCursor(data.nextCursor);
    } catch (e) { console.error(e); }
    setLoadingMore(false);
  }

  // Typing indicator
  function handleTyping(val) {
    setText(val);
    if (!socket) return;

    if (!isTyping.current) {
      isTyping.current = true;
      socket.emit('typing:start', { convId, userId: user.id, username: user.username });
    }

    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTyping.current = false;
      socket.emit('typing:stop', { convId, userId: user.id });
    }, 1500);
  }

  async function handleSend(e) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    // Stop typing indicator
    clearTimeout(typingTimer.current);
    isTyping.current = false;
    if (socket) socket.emit('typing:stop', { convId, userId: user.id });

    setText('');
    setSending(true);

    try {
      const msg = await sendMessage(convId, trimmed);
      // Optimistically add (socket will also fire, dedup in place)
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    } catch (e) {
      console.error(e);
      setText(trimmed); // restore on failure
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function insertEmoji(emoji) {
    setText((t) => t + emoji);
    inputRef.current?.focus();
  }

  // Group messages by date
  function groupedMessages() {
    const groups = [];
    let currentDate = null;
    messages.forEach((msg) => {
      const d = new Date(msg.createdAt).toDateString();
      if (d !== currentDate) {
        groups.push({ type: 'date', label: formatDateHeader(msg.createdAt), key: d });
        currentDate = d;
      }
      groups.push({ type: 'msg', ...msg });
    });
    return groups;
  }

  const isMine = (senderId) => senderId === user.id;

  return (
    <div className="fixed inset-0 bg-dark-bg flex flex-col max-w-lg mx-auto" id="chat-page">
      {/* Header */}
      <div className="glass-elevated border-b border-dark-border/30 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate('/messages')}
          className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-white/5 transition-colors"
          id="chat-back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {other && (
          <>
            <span className="text-2xl">{other.avatar || '😎'}</span>
            <div>
              <p className="text-sm font-semibold text-white">{other.displayName || other.username}</p>
              <p className="text-xs text-surface-400">@{other.username}</p>
            </div>
          </>
        )}
        {!other && !loading && (
          <p className="text-sm text-surface-400">Loading…</p>
        )}
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1"
        onScroll={(e) => { if (e.target.scrollTop < 80) loadMore(); }}
      >
        {loadingMore && (
          <div className="flex justify-center py-2">
            <div className="w-5 h-5 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
          </div>
        )}

        {loading && (
          <div className="flex-1 flex justify-center items-center">
            <div className="w-8 h-8 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
            <span className="text-4xl mb-3">👋</span>
            <p className="text-white font-semibold">Say hello!</p>
            <p className="text-sm text-surface-400 mt-1">Be the first to send a message.</p>
          </div>
        )}

        {groupedMessages().map((item) => {
          if (item.type === 'date') {
            return (
              <div key={item.key} className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-dark-border/30" />
                <span className="text-xs text-surface-500">{item.label}</span>
                <div className="flex-1 h-px bg-dark-border/30" />
              </div>
            );
          }

          const mine = isMine(item.sender.id);

          return (
            <div
              key={item.id}
              className={`flex ${mine ? 'justify-end' : 'justify-start'} items-end gap-2`}
            >
              {!mine && (
                <span className="text-lg mb-0.5">{item.sender.avatar || '😎'}</span>
              )}
              <div className={`group max-w-[72%]`}>
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    mine
                      ? 'bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-br-sm'
                      : 'bg-white/8 border border-dark-border/20 text-white rounded-bl-sm'
                  }`}
                >
                  {item.text}
                </div>
                <p className={`text-[10px] mt-1 text-surface-500 ${mine ? 'text-right' : 'text-left'}`}>
                  {formatTime(item.createdAt)}
                  {mine && item.readAt && ' · ✓✓'}
                </p>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingUser && (
          <div className="flex items-end gap-2">
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white/8 border border-dark-border/20">
              <div className="flex gap-1 items-center h-3">
                <span className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
            <p className="text-[10px] text-surface-500 mb-1">{typingUser} is typing</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick emoji row */}
      <div className="flex items-center gap-2 px-4 py-2 border-t border-dark-border/20 overflow-x-auto no-scrollbar">
        {QUICK_EMOJIS.map((em) => (
          <button
            key={em}
            onClick={() => insertEmoji(em)}
            className="text-xl shrink-0 hover:scale-125 transition-transform active:scale-90"
          >
            {em}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 px-4 py-3 glass-elevated border-t border-dark-border/30 shrink-0"
        id="chat-form"
      >
        <input
          ref={inputRef}
          type="text"
          placeholder="Message…"
          value={text}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
          className="flex-1 bg-white/5 border border-dark-border/30 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-surface-500 focus:outline-none focus:border-brand-500/50 transition-colors"
          id="chat-input"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-600 to-accent-pink flex items-center justify-center text-white shadow-lg shadow-brand-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          id="chat-send"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
