import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppShellLayout } from '@/layout/AppShell';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Surveys from '@/pages/Surveys';
import SurveyNew from '@/pages/SurveyNew';
import SurveyEdit from '@/pages/SurveyEdit';
import Audience from '@/pages/Audience';
import Earnings from '@/pages/Earnings';
import Analytics from '@/pages/Analytics';
import Notifications from '@/pages/Notifications';
import Settings from '@/pages/Settings';
import PublicSurvey from '@/pages/PublicSurvey';

function ProtectedShell() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <AppShellLayout />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/p/:id" element={<PublicSurvey />} />

            <Route element={<ProtectedShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/surveys" element={<Surveys />} />
              <Route path="/surveys/new" element={<SurveyNew />} />
              <Route path="/surveys/:id/edit" element={<SurveyEdit />} />
              <Route path="/audience" element={<Audience />} />
              <Route path="/earnings" element={<Earnings />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
