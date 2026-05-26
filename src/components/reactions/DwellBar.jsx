export default function DwellBar({ progress, isDwelling }) {
  if (progress <= 0 && !isDwelling) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/5 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-brand-500 via-accent-pink to-brand-400 transition-all duration-100 ease-linear"
        style={{ width: `${progress}%` }}
      />
      {progress >= 100 && (
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/0 via-white/20 to-brand-500/0 animate-shimmer" />
      )}
    </div>
  );
}
