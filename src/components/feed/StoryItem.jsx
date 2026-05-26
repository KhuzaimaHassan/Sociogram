import Avatar from '../shared/Avatar';

export default function StoryItem({ story }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[68px]">
      <div className="relative">
        <Avatar
          emoji={story.avatar}
          size="lg"
          hasStory={!story.isOwn}
          viewed={story.viewed}
        />
        {story.isOwn && (
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center border-2 border-dark-bg">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
        )}
      </div>
      <span className="text-[11px] text-white/60 truncate w-16 text-center">
        {story.isOwn ? 'Your Story' : story.username.split('.')[0]}
      </span>
    </div>
  );
}
