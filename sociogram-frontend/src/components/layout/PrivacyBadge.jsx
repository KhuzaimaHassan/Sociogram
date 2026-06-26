import { useExpression } from '../../context/ExpressionContext';

export default function PrivacyBadge() {
  const { isCameraActive, isEnabled, hasConsent, toggleEnabled } = useExpression();

  if (!hasConsent) return null;

  return (
    <button
      onClick={toggleEnabled}
      className="fixed top-16 right-3 z-30 glass rounded-full px-3 py-1.5 flex items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95"
      title={isCameraActive ? 'Expression detection active — click to disable' : 'Expression detection off — click to enable'}
      id="privacy-badge"
    >
      {/* Status dot */}
      <span className="relative flex h-2 w-2">
        {isCameraActive ? (
          <>
            <span className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </>
        ) : (
          <span className="relative inline-flex rounded-full h-2 w-2 bg-surface-500" />
        )}
      </span>

      <span className="text-[11px] font-medium text-white/70">
        {isCameraActive ? '👁 Active' : '👁 Off'}
      </span>
    </button>
  );
}
