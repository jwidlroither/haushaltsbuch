import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !isLoading) navigate('/', { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-raised)] px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full
          bg-[var(--accent)] opacity-5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full
          bg-[var(--success)] opacity-5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-up">
        {/* Card */}
        <div className="card p-8 text-center">
          {/* Logo */}
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent)] flex items-center justify-center
            mx-auto mb-6 shadow-lg">
            <span className="text-white text-2xl font-bold font-display">H</span>
          </div>

          <h1 className="font-display text-3xl text-[var(--ink)] mb-2">Haushaltsbuch</h1>
          <p className="text-[var(--ink-muted)] text-sm mb-8">
            Deine persönlichen Finanzen, klar und einfach.
          </p>

          <button
            onClick={login}
            disabled={isLoading}
            className="btn-primary w-full py-3 text-base"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Laden...
              </span>
            ) : (
              <>
                <span>Anmelden mit SSO</span>
                <span className="text-white/70">→</span>
              </>
            )}
          </button>

          <p className="text-xs text-[var(--ink-faint)] mt-6">
            Gesicherte Anmeldung über OpenID Connect
          </p>
        </div>

        <p className="text-center text-xs text-[var(--ink-faint)] mt-6">
          Haushaltsbuch · Deine Finanzen im Überblick
        </p>
      </div>
    </div>
  );
}
