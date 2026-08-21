import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const { setToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setToken(token);
      navigate('/', { replace: true });
    } else {
      navigate('/login?error=auth_failed', { replace: true });
    }
  }, [searchParams, setToken, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-raised)]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full
          animate-spin mx-auto mb-4" />
        <p className="text-[var(--ink-muted)] text-sm">Anmeldung wird abgeschlossen...</p>
      </div>
    </div>
  );
}
