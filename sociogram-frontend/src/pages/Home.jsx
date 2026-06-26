import { useExpression } from '../context/ExpressionContext';
import Modal from '../components/shared/Modal';
import Feed from '../components/feed/Feed';

export default function Home() {
  const { showConsentModal, grantConsent, denyConsent } = useExpression();

  return (
    <>
      <Feed />

      {/* Privacy Consent Modal */}
      <Modal isOpen={showConsentModal} size="md">
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-pink flex items-center justify-center mb-5 shadow-lg glow-brand">
            <span className="text-3xl">🎭</span>
          </div>

          <h2 className="text-xl font-bold text-white mb-2">
            Expression Reactions
          </h2>

          <p className="text-sm text-surface-300 leading-relaxed mb-6 max-w-sm mx-auto">
            Sociogram uses your front camera to detect facial expressions while you browse. 
            <strong className="text-white"> No images or video are ever stored or uploaded</strong> — only 
            the detected emotion label is used. You can disable this anytime in Settings.
          </p>

          {/* Privacy badges */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {[
              { icon: '🔒', text: 'On-device only' },
              { icon: '🚫', text: 'No uploads' },
              { icon: '📱', text: 'Camera stays private' },
            ].map((badge) => (
              <span key={badge.text} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-surface-300">
                <span>{badge.icon}</span>
                {badge.text}
              </span>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={grantConsent}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-accent-pink text-white font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/25 active:scale-[0.98]"
              id="consent-allow"
            >
              ✨ Allow Expression Reactions
            </button>
            <button
              onClick={denyConsent}
              className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-medium text-sm hover:bg-white/10 transition-all duration-200 active:scale-[0.98]"
              id="consent-deny"
            >
              No thanks, use manual reactions
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
