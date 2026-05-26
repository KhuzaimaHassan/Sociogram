import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ExpressionProvider } from './context/ExpressionContext';
import AuthGuard from './components/auth/AuthGuard';
import TopNav from './components/layout/TopNav';
import BottomNav from './components/layout/BottomNav';
import PrivacyBadge from './components/layout/PrivacyBadge';
import Toast from './components/shared/Toast';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Reels from './pages/Reels';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import CreatePost from './pages/CreatePost';

function ProtectedShell({ children }) {
  const location = useLocation();
  const isReels = location.pathname === '/reels';
  const isCreate = location.pathname === '/create';

  return (
    <AppProvider>
      <ExpressionProvider>
        <div className="min-h-screen bg-dark-bg">
          {!isReels && !isCreate && <TopNav />}
          {!isReels && !isCreate && <PrivacyBadge />}
          <main className={isReels || isCreate ? '' : 'pt-14 pb-16'}>
            {children}
          </main>
          {!isReels && !isCreate && <BottomNav />}
          <Toast />
        </div>
      </ExpressionProvider>
    </AppProvider>
  );
}

function PublicOnly({ children }) {
  const { isAuthenticated, isInitializing } = useAuth();
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
      </div>
    );
  }
  if (isAuthenticated) {
    window.location.replace('/');
    return null;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

        {/* Protected app routes */}
        <Route
          path="/*"
          element={
            <AuthGuard>
              <ProtectedShell>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/reels" element={<Reels />} />
                  <Route path="/create" element={<CreatePost />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/:username" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </ProtectedShell>
            </AuthGuard>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
