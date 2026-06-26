/**
 * Settings.jsx — Fully functional settings page.
 *
 * Sections:
 * 1. Account — avatar, name, email, link to edit profile
 * 2. Security — Change Password (with validation)
 * 3. Expression Reactions — toggle + camera status + about
 * 4. Notifications — functional local toggles (persisted to localStorage)
 * 5. Privacy — data pledge
 * 6. Danger Zone — Delete Account (requires password confirmation)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpression } from '../context/ExpressionContext';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import Modal from '../components/shared/Modal';
import { api } from '../services/apiClient';
import { tokenStore } from '../services/apiClient';

// ── Helpers ────────────────────────────────────────────────
function Toggle({ on, onToggle, id }) {
  return (
    <button
      id={id}
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${on ? 'bg-brand-500' : 'bg-surface-600'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

function SectionHeader({ children }) {
  return <h2 className="text-[11px] font-semibold text-surface-400 uppercase tracking-widest mb-2 px-1">{children}</h2>;
}

function SettingsCard({ children }) {
  return <div className="glass rounded-2xl overflow-hidden divide-y divide-dark-border/30 mb-5">{children}</div>;
}

function SettingsRow({ icon, title, subtitle, right, onClick, danger }) {
  const base = `w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors`;
  const hover = onClick ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default';
  return (
    <div className={`${base} ${hover}`} onClick={onClick}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && <span className="text-xl flex-shrink-0">{icon}</span>}
        <div className="min-w-0">
          <p className={`text-sm font-medium ${danger ? 'text-accent-rose' : 'text-white'} truncate`}>{title}</p>
          {subtitle && <p className="text-xs text-surface-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="ml-3 flex-shrink-0">{right}</div>}
    </div>
  );
}

// Persisted notification prefs (localStorage)
const NOTIF_KEY = 'sociogram_notif_prefs';
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY)) || {}; } catch { return {}; }
}
function savePrefs(p) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(p));
}

const NOTIF_ITEMS = [
  { key: 'likes',     icon: '❤️', label: 'Likes',              sub: 'When someone likes your post' },
  { key: 'comments',  icon: '💬', label: 'Comments',           sub: 'When someone comments on your post' },
  { key: 'followers', icon: '👥', label: 'New Followers',      sub: 'When someone starts following you' },
  { key: 'messages',  icon: '✉️', label: 'Messages',           sub: 'When you receive a direct message' },
  { key: 'stories',   icon: '📸', label: 'Stories',            sub: 'When people you follow add stories' },
  { key: 'reactions', icon: '😍', label: 'Expression Captures',sub: 'When your expression is captured' },
];

export default function Settings() {
  const { isEnabled, hasConsent, toggleEnabled, isCameraActive } = useExpression();
  const { user, logout, setUser } = useAuth();
  const { showToast } = useApp();
  const navigate = useNavigate();

  // ── Notification prefs ──────────────────────────────────
  const [notifPrefs, setNotifPrefs] = useState(() => {
    const saved = loadPrefs();
    const defaults = Object.fromEntries(NOTIF_ITEMS.map((i) => [i.key, true]));
    return { ...defaults, ...saved };
  });

  function toggleNotif(key) {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      savePrefs(next);
      return next;
    });
  }

  // ── Change Password ────────────────────────────────────
  const [pwModal, setPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState(null);

  async function handleChangePassword(e) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match'); return; }
    if (pwForm.next.length < 6) { setPwError('New password must be at least 6 characters'); return; }
    setPwLoading(true); setPwError(null);
    try {
      await api.post('/api/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      showToast('✅ Password changed!', { duration: 3000 });
      setPwModal(false);
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwLoading(false);
    }
  }

  // ── Delete Account ─────────────────────────────────────
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1); // 1=confirm, 2=password
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  async function handleDeleteAccount(e) {
    e.preventDefault();
    setDeleteLoading(true); setDeleteError(null);
    try {
      await api.delete('/api/auth/account', { body: { password: deletePassword } });
      tokenStore.clear();
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  // ── About Expression modal ─────────────────────────────
  const [showAbout, setShowAbout] = useState(false);

  return (
    <div className="feed-container pb-28">
      <div className="px-4 py-5">
        <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

        {/* ── Account ──────────────────────────────────── */}
        <SectionHeader>Account</SectionHeader>
        <SettingsCard>
          <SettingsRow
            icon={user?.avatar || '😎'}
            title={user?.displayName || user?.username || 'You'}
            subtitle={`@${user?.username} · ${user?.email}`}
            right={
              <button onClick={() => navigate('/profile')} className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors">
                View
              </button>
            }
          />
          <SettingsRow
            icon="✏️"
            title="Edit Profile"
            subtitle="Change name, bio, and avatar"
            right={<ChevronRight />}
            onClick={() => navigate('/profile')}
          />
          <SettingsRow
            icon="🔑"
            title="Change Password"
            subtitle="Update your login password"
            right={<ChevronRight />}
            onClick={() => { setPwModal(true); setPwError(null); setPwForm({ current: '', next: '', confirm: '' }); }}
          />
        </SettingsCard>

        {/* ── Expression Reactions ─────────────────────── */}
        <SectionHeader>Expression Reactions</SectionHeader>
        <SettingsCard>
          <SettingsRow
            icon="🎭"
            title="Expression Reactions"
            subtitle="Auto-react while you scroll"
            right={<Toggle on={isEnabled && hasConsent} onToggle={toggleEnabled} id="toggle-expression" />}
          />
          <SettingsRow
            icon="📷"
            title="Camera Status"
            subtitle={isCameraActive ? 'Active — detecting expressions' : 'Inactive'}
            right={
              <span className={`w-2.5 h-2.5 rounded-full ${isCameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-surface-600'}`} />
            }
          />
          <SettingsRow
            icon="ℹ️"
            title="How it works"
            right={<ChevronRight />}
            onClick={() => setShowAbout(true)}
          />
        </SettingsCard>

        {/* ── Notifications ────────────────────────────── */}
        <SectionHeader>Notifications</SectionHeader>
        <SettingsCard>
          {NOTIF_ITEMS.map((item) => (
            <SettingsRow
              key={item.key}
              icon={item.icon}
              title={item.label}
              subtitle={item.sub}
              right={
                <Toggle
                  on={notifPrefs[item.key]}
                  onToggle={() => toggleNotif(item.key)}
                  id={`notif-${item.key}`}
                />
              }
            />
          ))}
        </SettingsCard>

        {/* ── Privacy ──────────────────────────────────── */}
        <SectionHeader>Privacy & Data</SectionHeader>
        <SettingsCard>
          <div className="px-4 py-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl">🔒</span>
              <p className="text-sm font-medium text-white">Your Data Pledge</p>
            </div>
            <div className="ml-9 space-y-2">
              {[
                'Camera video never leaves your device',
                'Only emotion labels (e.g. "happy") are used',
                'No facial images are stored or uploaded',
                'You can disable or delete anytime',
              ].map((item) => (
                <p key={item} className="text-xs text-surface-300 flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
                  {item}
                </p>
              ))}
            </div>
          </div>
        </SettingsCard>

        {/* ── Danger Zone ──────────────────────────────── */}
        <SectionHeader>Danger Zone</SectionHeader>
        <SettingsCard>
          <SettingsRow
            icon="🚪"
            title="Log out"
            right={<ChevronRight className="text-surface-500" />}
            onClick={() => { logout(); navigate('/login', { replace: true }); }}
          />
          <SettingsRow
            icon="⚠️"
            title="Delete Account"
            subtitle="Permanently delete all your data"
            right={<ChevronRight className="text-accent-rose/60" />}
            danger
            onClick={() => { setDeleteModal(true); setDeleteStep(1); setDeletePassword(''); setDeleteError(null); }}
          />
        </SettingsCard>

        {/* App info */}
        <div className="text-center mt-6">
          <p className="gradient-text font-bold text-lg">Sociogram</p>
          <p className="text-xs text-surface-500 mt-1">Version 1.0.0 · Built with ❤️</p>
        </div>
      </div>

      {/* ── Change Password Modal ─────────────────────── */}
      <Modal isOpen={pwModal} onClose={() => setPwModal(false)} title="Change Password" size="md">
        <form onSubmit={handleChangePassword} className="space-y-4">
          {[
            { label: 'Current password', key: 'current', placeholder: 'Enter current password' },
            { label: 'New password', key: 'next', placeholder: 'Min. 6 characters' },
            { label: 'Confirm new password', key: 'confirm', placeholder: 'Repeat new password' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-surface-300 mb-1.5">{label}</label>
              <input
                type="password"
                value={pwForm[key]}
                onChange={(e) => setPwForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-colors"
                required
              />
            </div>
          ))}
          {pwError && <p className="text-xs text-accent-rose bg-accent-rose/10 border border-accent-rose/20 rounded-xl px-3 py-2">⚠️ {pwError}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setPwModal(false)} className="flex-1 py-2.5 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm font-medium text-white hover:bg-white/8 transition-colors">Cancel</button>
            <button type="submit" disabled={pwLoading} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-pink text-white text-sm font-semibold disabled:opacity-50 shadow-lg shadow-brand-500/20">
              {pwLoading ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Account Modal ──────────────────────── */}
      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        title={deleteStep === 1 ? '⚠️ Delete Account?' : 'Confirm with Password'}
        size="md"
      >
        {deleteStep === 1 ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-accent-rose/10 border border-accent-rose/20 text-sm text-accent-rose space-y-2">
              <p className="font-semibold">This action is permanent and cannot be undone.</p>
              <p className="text-xs text-accent-rose/80">All your posts, stories, messages, followers, and account data will be deleted forever.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteModal(false)} className="flex-1 py-2.5 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm font-medium text-white hover:bg-white/8">
                Cancel
              </button>
              <button onClick={() => setDeleteStep(2)} className="flex-1 py-2.5 rounded-xl bg-accent-rose text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                Yes, Delete
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <p className="text-sm text-surface-300">Enter your password to confirm account deletion.</p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Your password"
              className="w-full px-4 py-2.5 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-accent-rose/50 focus:ring-1 focus:ring-accent-rose/20 transition-colors"
              required
              autoFocus
            />
            {deleteError && <p className="text-xs text-accent-rose bg-accent-rose/10 border border-accent-rose/20 rounded-xl px-3 py-2">⚠️ {deleteError}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => { setDeleteModal(false); setDeleteStep(1); }} className="flex-1 py-2.5 rounded-xl bg-dark-elevated border border-dark-border/50 text-sm font-medium text-white hover:bg-white/8">
                Cancel
              </button>
              <button type="submit" disabled={deleteLoading || !deletePassword} className="flex-1 py-2.5 rounded-xl bg-accent-rose text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50">
                {deleteLoading ? 'Deleting…' : 'Delete Forever'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── About Expression Reactions ─────────────────── */}
      <Modal isOpen={showAbout} onClose={() => setShowAbout(false)} title="About Expression Reactions" size="md">
        <div className="space-y-4 text-sm text-surface-300">
          <p>Sociogram's unique feature that automatically detects your facial expression while browsing and posts an emoji reaction — entirely on-device.</p>
          <div>
            <p className="font-semibold text-white mb-2">How it works:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-xs">
              <li>When you view a post for 5+ seconds, one frame is captured</li>
              <li>face-api.js (running locally) detects your expression</li>
              <li>If 65%+ confidence, an emoji reaction is posted</li>
              <li>You always get a 3-second undo option</li>
            </ol>
          </div>
          <div>
            <p className="font-semibold text-white mb-2">Expression → Emoji:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {['Happy → 😍', 'Surprised → 😮', 'Sad → 😢', 'Angry → 😠', 'Fearful → 😨', 'Disgusted → 🤢'].map((e) => (
                <span key={e} className="px-3 py-1.5 rounded-lg bg-white/5 text-xs">{e}</span>
              ))}
            </div>
          </div>
          <p className="text-xs text-surface-500">Neutral expressions are never posted. No face detected = no reaction.</p>
        </div>
      </Modal>
    </div>
  );
}

function ChevronRight({ className = 'text-surface-500' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
