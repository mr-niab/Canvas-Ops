import { useState } from 'react';
import { useAppContext } from '../AppContext';

type Mode = 'login' | 'register';

export function AuthScreen() {
  const { signIn, signUp, authError } = useAppContext();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const swap = (next: Mode) => {
    setMode(next);
    setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setLocalError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.includes('@')) {
      setLocalError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setLocalError('Please enter your name.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signIn(trimmedEmail, password);
      } else {
        await signUp(name.trim(), trimmedEmail, password);
      }
    } catch {
      // authError is set inside the context; nothing more to do here.
    } finally {
      setSubmitting(false);
    }
  };

  const errorToShow = localError ?? authError;

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="logo">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          CanvasOps
        </div>
        <h1 className="auth-title">
          {mode === 'login' ? 'Sign in' : 'Create your account'}
        </h1>
        <p className="auth-sub">
          {mode === 'login'
            ? 'Welcome back. Sign in to your studio.'
            : 'Set up a new studio in seconds.'}
        </p>

        <form className="form-grid" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div>
              <label className="field-label" htmlFor="auth-name">
                Your name
              </label>
              <input
                id="auth-name"
                className="field-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Designer"
                autoComplete="name"
                autoFocus
              />
            </div>
          )}
          <div>
            <label className="field-label" htmlFor="auth-email">
              Email
            </label>
            <input
              id="auth-email"
              className="field-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@studio.com"
              autoComplete="email"
              autoFocus={mode === 'login'}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              className="field-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {errorToShow && <div className="form-error">{errorToShow}</div>}

          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting
                ? mode === 'login'
                  ? 'Signing in…'
                  : 'Creating account…'
                : mode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </div>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>
              No account yet?{' '}
              <button type="button" className="auth-link" onClick={() => swap('register')}>
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" className="auth-link" onClick={() => swap('login')}>
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
