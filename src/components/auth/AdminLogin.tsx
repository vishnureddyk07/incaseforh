import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const apiBase = import.meta.env.VITE_API_URL || 'https://incaseforh.vercel.app';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [setupKey, setSetupKey] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Check if admin exists - if not, show setup mode
  useEffect(() => {
    const checkAdminExists = async () => {
      try {
        console.log('AdminLogin using API base:', apiBase);
        const res = await fetch(`${apiBase}/api/v1/admin/check`, {
          method: 'GET',
        });
        const data = await res.json().catch(() => ({ exists: false }));
        setIsSetupMode(!data.exists);
      } catch (err) {
        // If endpoint doesn't exist, assume setup might be needed
        console.log('Could not check admin status');
      } finally {
        setCheckingSetup(false);
      }
    };

    checkAdminExists();
  }, [apiBase]);

  const handleLogin = async (e: React.FormEvent) => {
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

      if (data.user.role !== 'admin') {
        throw new Error('Only admin accounts can sign in here.');
      }

      login(data.user, data.token);
      navigate('/admin/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/api/v1/auth/register-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, setupKey: setupKey || undefined }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Registration failed');
      }

      await res.json().catch(() => ({}));
      // After registration, log in automatically
      const loginRes = await fetch(`${apiBase}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!loginRes.ok) {
        throw new Error('Failed to log in after registration');
      }

      const loginData = await loginRes.json();
      if (!loginData.token || !loginData.user) {
        throw new Error('Invalid login response after registration');
      }
      if (loginData.user.role !== 'admin') {
        throw new Error('Registered account is not admin. Contact support.');
      }
      login(loginData.user, loginData.token);
      navigate('/admin/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-gray-600">Checking admin status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {isSetupMode ? 'Create Admin Account' : 'Admin Login'}
        </h1>
        
        {isSetupMode ? (
          <form onSubmit={handleRegisterAdmin} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
              <p className="text-sm text-blue-700">
                No admin account exists yet. Create the first admin account to get started.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Admin Email</label>
              <input
                type="email"
                className="mt-1 block w-full rounded-md border px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                className="mt-1 block w-full rounded-md border px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <input
                type="password"
                className="mt-1 block w-full rounded-md border px-3 py-2"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Setup Key (Optional)</label>
              <input
                type="password"
                className="mt-1 block w-full rounded-md border px-3 py-2"
                value={setupKey}
                onChange={(e) => setSetupKey(e.target.value)}
                placeholder="Leave blank if no setup key is configured"
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Admin Account'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Admin ID or Email</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                className="mt-1 block w-full rounded-md border px-3 py-2"
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
              className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        <p className="mt-4 text-sm text-gray-600">
          {isSetupMode
            ? 'Create your admin account to manage QR codes and user access.'
            : 'Use your admin credentials. Managers will log in from their own page later.'}
        </p>
      </div>
    </div>
  );
}
