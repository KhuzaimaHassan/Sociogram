import { useApp } from '../../context/AppContext';
import ReelCard from './ReelCard';

export default function ReelViewer() {
  const { posts } = useApp();
  const reels = posts.filter(p => p.isReel);

  // If no reels, show all posts as reels for demo
  const displayReels = reels.length > 0 ? reels : posts.slice(0, 5);

  return (
    <div className="h-screen overflow-y-auto snap-mandatory no-scrollbar bg-black">
      {displayReels.map((reel) => (
        <ReelCard key={reel.id} post={reel} />
      ))}
    </div>
  );
}
