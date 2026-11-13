import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SessionStatus from './SessionStatus';

export default function AuthGuard({ children }) {
  const { isAuthenticated, isInitializing, sessionError } = useAuth();
  const location = useLocation();

  if (isInitializing || sessionError) return <SessionStatus />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
