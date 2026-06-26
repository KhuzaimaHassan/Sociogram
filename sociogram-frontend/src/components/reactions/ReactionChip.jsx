export default function ReactionChip({ emoji, count, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
        isActive
          ? 'bg-brand-600/30 border border-brand-500/50 text-brand-200'
          : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
      }`}
    >
      <span className="text-sm">{emoji}</span>
      <span>{formatCount(count)}</span>
    </button>
  );
}

function formatCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n;
}
