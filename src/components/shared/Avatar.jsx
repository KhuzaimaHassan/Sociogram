export default function Avatar({ emoji, size = 'md', hasStory = false, viewed = false, onClick, className = '' }) {
  const sizes = {
    xs: 'w-6 h-6 text-sm',
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-xl',
    lg: 'w-14 h-14 text-2xl',
    xl: 'w-20 h-20 text-4xl',
    '2xl': 'w-28 h-28 text-5xl',
  };

  const ringClass = hasStory
    ? viewed
      ? 'story-ring-viewed'
      : 'story-ring'
    : '';

  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 ${ringClass} ${onClick ? 'cursor-pointer' : 'cursor-default'} ${className}`}
      type="button"
    >
      <div
        className={`${sizes[size]} rounded-full bg-dark-elevated flex items-center justify-center border-2 border-dark-bg`}
      >
        <span role="img" aria-label="avatar">{emoji}</span>
      </div>
    </button>
  );
}
