import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpression } from '../context/ExpressionContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/shared/Modal';

export default function Settings() {
  const { isEnabled, hasConsent, toggleEnabled, isCameraActive } = useExpression();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showAbout, setShowAbout] = useState(false);

  return (
    <div className="feed-container pb-24">
      <div className="px-4 py-5">
        <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

        {/* Expression Reactions */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Expression Reactions</h2>
          <div className="glass rounded-2xl overflow-hidden divide-y divide-dark-border/30">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="text-xl">🎭</span>
                <div>
                  <p className="text-sm font-medium text-white">Expression Reactions</p>
                  <p className="text-xs text-surface-400">Auto-react with facial expressions</p>
                </div>
              </div>
              <button onClick={toggleEnabled} className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isEnabled && hasConsent ? 'bg-brand-500' : 'bg-surface-600'}`} id="toggle-expression">
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${isEnabled && hasConsent ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="text-xl">📷</span>
                <div>
                  <p className="text-sm font-medium text-white">Camera Status</p>
                  <p className="text-xs text-surface-400">{isCameraActive ? 'Active — detecting expressions' : 'Inactive'}</p>
                </div>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full ${isCameraActive ? 'bg-emerald-400 animate-pulse-dot' : 'bg-surface-600'}`} />
            </div>
            <button onClick={() => setShowAbout(true)} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors" id="about-expressions">
              <div className="flex items-center gap-3">
                <span className="text-xl">ℹ️</span>
                <p className="text-sm font-medium text-white">About Expression Reactions</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-500"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </section>

        {/* Privacy */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Privacy</h2>
          <div className="glass rounded-2xl overflow-hidden divide-y divide-dark-border/30">
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">🔒</span>
                <p className="text-sm font-medium text-white">Your Data</p>
              </div>
              <div className="ml-9 space-y-1.5">
                {['Camera video never leaves your device', 'Only emotion labels (e.g. "happy") are used', 'No facial data is stored or uploaded', 'You can disable anytime'].map((item) => (
                  <p key={item} className="text-xs text-surface-300 flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>{item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Notifications</h2>
          <div className="glass rounded-2xl overflow-hidden divide-y divide-dark-border/30">
            {[['Likes', true], ['Comments', true], ['New Followers', true], ['Reaction Captures', true]].map(([label, def]) => (
              <div key={label} className="flex items-center justify-between px-4 py-3.5">
                <p className="text-sm text-white">{label}</p>
                <div className={`w-11 h-6 rounded-full ${def ? 'bg-brand-500' : 'bg-surface-600'} relative`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md ${def ? 'left-[22px]' : 'left-0.5'}`} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Account */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Account</h2>
          <div className="glass rounded-2xl overflow-hidden divide-y divide-dark-border/30">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="text-xl">{user?.avatar || '😎'}</span>
                <div>
                  <p className="text-sm font-medium text-white">{user?.displayName || user?.username || 'You'}</p>
                  <p className="text-xs text-surface-400">@{user?.username}</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="text-xs font-medium text-brand-400 hover:text-brand-300"
              >
                View
              </button>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors"
              id="logout-button"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🚪</span>
                <p className="text-sm font-medium text-accent-rose">Log out</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-500"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        </section>

        {/* App info */}
        <div className="text-center mt-8">
          <p className="gradient-text font-bold text-lg">Sociogram</p>
          <p className="text-xs text-surface-500 mt-1">Version 1.0.0 · Phase 2</p>
        </div>
      </div>

      {/* About Modal */}
      <Modal isOpen={showAbout} onClose={() => setShowAbout(false)} title="About Expression Reactions" size="md">
        <div className="space-y-4 text-sm text-surface-300">
          <p>Expression Reactions is Sociogram's unique feature that automatically detects your facial expression while browsing and posts an emoji reaction.</p>
          <div>
            <p className="font-semibold text-white mb-2">How it works:</p>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>When you view a post for 5+ seconds, we capture a single frame</li>
              <li>face-api.js (running on your device) detects your expression</li>
              <li>If a clear emotion is detected (65%+ confidence), an emoji is posted</li>
              <li>You always get an undo option for 3 seconds</li>
            </ol>
          </div>
          <div>
            <p className="font-semibold text-white mb-2">Expression → Emoji:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[['Happy → 😍', 'Love'], ['Surprised → 😮', 'Wow'], ['Sad → 😢', 'Sad'], ['Angry → 😠', 'Angry'], ['Fearful → 😨', 'Scared'], ['Disgusted → 🤢', 'Yuck']].map(([expr]) => (
                <span key={expr} className="px-3 py-1.5 rounded-lg bg-white/5 text-xs">{expr}</span>
              ))}
            </div>
          </div>
          <p className="text-xs text-surface-500 mt-4">Neutral expressions are never posted. No face = no reaction.</p>
        </div>
      </Modal>
    </div>
  );
}
