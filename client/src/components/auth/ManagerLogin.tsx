import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ManagerLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const apiBase = import.meta.env.VITE_API_URL || 'https://incaseforh.onrender.com';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Warm up backend connection while user fills credentials.
    fetch(`${apiBase}/health`, { method: 'GET' }).catch(() => undefined);
  }, [apiBase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Login failed');
      }

      const data = await res.json();
      if (!data.token || !data.user) {
        throw new Error('Invalid login response');
      }

      if (data.user.role !== 'manager') {
        throw new Error('Manager access only');
      }

      login(data.user, data.token);
      navigate('/manager/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-primary px-4">
      <div className="max-w-md w-full card-elevated p-8 border border-primary-200">
        <h1 className="text-2xl font-bold text-neutral-900 mb-6">Manager Login</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Manager Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary-lg w-full disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p className="mt-4 text-sm text-neutral-600">Admins should continue using the admin login page.</p>
      </div>
    </div>
  );
}
