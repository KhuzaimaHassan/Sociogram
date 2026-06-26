export default function PostSkeleton() {
  return (
    <div className="p-4 border-b border-dark-border/20 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-dark-elevated"></div>
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-dark-elevated rounded w-1/4"></div>
          <div className="h-2 bg-dark-elevated rounded w-1/6"></div>
        </div>
      </div>
      <div className="w-full aspect-square bg-dark-elevated rounded-xl mb-4"></div>
      <div className="space-y-2">
        <div className="h-3 bg-dark-elevated rounded w-3/4"></div>
        <div className="h-3 bg-dark-elevated rounded w-1/2"></div>
      </div>
    </div>
  );
}
