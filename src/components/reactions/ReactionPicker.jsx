import { useState, useEffect, useRef } from 'react';
import { allReactionEmojis } from '../../utils/expressionToEmoji';

export default function ReactionPicker({ onSelect, onClose, currentReaction }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-dismiss after 4 seconds
    timeoutRef.current = setTimeout(() => {
      handleClose();
    }, 4000);

    // Click outside
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        handleClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  function handleClose() {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 200);
  }

  function handleSelect(emoji) {
    onSelect?.(emoji);
    handleClose();
  }

  return (
    <div
      ref={ref}
      className={`absolute bottom-full left-0 mb-2 z-20 transition-all duration-200 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
      }`}
    >
      <div className="glass rounded-2xl px-2 py-1.5 flex items-center gap-0.5 shadow-xl glow-brand">
        {allReactionEmojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleSelect(emoji)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl text-xl transition-all duration-150 hover:scale-125 hover:bg-white/10 active:scale-100 ${
              currentReaction === emoji ? 'bg-brand-600/30 scale-110' : ''
            }`}
            id={`reaction-${emoji}`}
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
