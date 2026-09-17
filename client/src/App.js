import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import SetPin from './pages/SetPin';
import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import Nav from './components/Nav';

function ProtectedRoute({ children, adminOnly }) {
  const { token, staff } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (staff?.requires_pin_reset) return <Navigate to="/set-pin" replace />;
  if (adminOnly && staff?.role !== 'admin') return <Navigate to="/scan" replace />;
  return children;
}

function AppRoutes() {
  const { token, staff, logout } = useAuth();

  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, [logout]);

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (staff?.requires_pin_reset) {
    return (
      <Routes>
        <Route path="/set-pin" element={<SetPin />} />
        <Route path="*" element={<Navigate to="/set-pin" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <Nav />
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute adminOnly>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <ProtectedRoute>
              <Scanner />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={<Navigate to={staff?.role === 'admin' ? '/dashboard' : '/scan'} replace />}
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
