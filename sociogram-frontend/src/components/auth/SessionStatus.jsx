import { useAuth } from '../../context/AuthContext';

export default function SessionStatus() {
  const { sessionError, retrySession } = useAuth();
  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-5 py-10">
      {sessionError ? (
        <section role="alert" className="glass w-full max-w-sm rounded-2xl p-6 text-center">
          <h1 className="text-xl font-semibold text-white">Can’t connect right now</h1>
          <p className="mt-3 text-sm text-surface-300">We couldn’t check your session. Your sign-in is saved. Try again when the service is available.</p>
          <button type="button" onClick={retrySession} className="mt-5 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400">Retry connection</button>
        </section>
      ) : (
        <div role="status" className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
          <p className="text-xs text-surface-400">Loading Sociogram…</p>
        </div>
      )}
    </div>
  );
}
