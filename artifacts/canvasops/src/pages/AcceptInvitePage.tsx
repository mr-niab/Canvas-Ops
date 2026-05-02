import { useEffect, useMemo, useState } from 'react';
import { acceptInvite } from '@workspace/api-client-react';

function describeError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Unexpected error';
}

function getTokenFromUrl(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return (params.get('token') ?? '').trim();
}

export function AcceptInvitePage() {
  const initialToken = useMemo(getTokenFromUrl, []);
  const [token, setToken] = useState(initialToken);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!initialToken) {
      setError('This invite link is missing a token.');
    }
  }, [initialToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await acceptInvite({
        token: token.trim(),
        email: email.trim(),
        name: name.trim(),
        password,
      });
      setSuccess(true);
      // Redirect into the workspace after a brief moment.
      window.setTimeout(() => {
        window.location.assign('/');
      }, 1200);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app">
      <main className="main" style={{ display: 'flex', justifyContent: 'center', padding: '48px 16px' }}>
        <section style={{ width: '100%', maxWidth: 480 }}>
          <div className="page-head">
            <div>
              <div className="eyebrow">CanvasOps</div>
              <h1>Accept your invite</h1>
              <p className="sub flush">
                Create your account to join the organisation that invited you.
              </p>
            </div>
          </div>

          <div className="card pad">
            {success ? (
              <div className="people-empty">
                You're in! Redirecting to your workspace…
              </div>
            ) : (
              <form className="stack" onSubmit={handleSubmit}>
                <label className="stack" style={{ gap: 4 }}>
                  <span className="eyebrow">Invite token</span>
                  <input
                    className="field-input"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="inv_..."
                    required
                  />
                </label>
                <label className="stack" style={{ gap: 4 }}>
                  <span className="eyebrow">Email</span>
                  <input
                    className="field-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </label>
                <label className="stack" style={{ gap: 4 }}>
                  <span className="eyebrow">Your name</span>
                  <input
                    className="field-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ada Lovelace"
                    required
                  />
                </label>
                <label className="stack" style={{ gap: 4 }}>
                  <span className="eyebrow">Choose a password</span>
                  <input
                    className="field-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
                  />
                </label>
                {error && <div className="people-empty">{error}</div>}
                <button
                  type="submit"
                  className="btn primary"
                  disabled={submitting || !token.trim() || !email.trim() || !name.trim() || password.length < 8}
                >
                  {submitting ? 'Joining…' : 'Join organisation'}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
