import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import AppLayout from './components/layout/AppLayout';
import ToastContainer from './components/ui/ToastContainer';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import CategoriesPage from './pages/CategoriesPage';
import RecurringPage from './pages/RecurringPage';
import GoalsPage from './pages/GoalsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // 30s fresh
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-raised)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"/>
        <p className="text-sm text-[var(--ink-faint)]">Wird geladen...</p>
      </div>
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login"         element={<LoginPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route index                element={<DashboardPage />} />
                  <Route path="transactions"  element={<TransactionsPage />} />
                  <Route path="recurring"     element={<RecurringPage />} />
                  <Route path="goals"         element={<GoalsPage />} />
                  <Route path="categories"    element={<CategoriesPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <ToastContainer />
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
