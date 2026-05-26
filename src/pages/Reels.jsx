import ReelViewer from '../components/reel/ReelViewer';

export default function Reels() {
  return (
    <div className="fixed inset-0 z-30 bg-black">
      <ReelViewer />

      {/* Back button */}
      <button
        onClick={() => window.history.back()}
        className="fixed top-4 left-4 z-50 p-2 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
        id="reels-back"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Title */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <h1 className="text-white font-bold text-lg text-shadow-md">Reels</h1>
      </div>

      {/* Camera */}
      <button className="fixed top-4 right-4 z-50 p-2 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors" id="reels-camera">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </button>
    </div>
  );
}
