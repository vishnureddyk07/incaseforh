import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PoliceLogin() {
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Warm up backend connection while user fills credentials.
    fetch(`${apiBase}/health`, { method: 'GET' }).catch(() => undefined);
  }, [apiBase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBase}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Verify role is police
      if (data.user.role !== 'police') {
        throw new Error('This account is not authorized for police access');
      }

      // Store auth data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      navigate('/police/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">👮</div>
          <h1 className="text-4xl font-bold text-neutral-900 mb-2">Police Control</h1>
          <p className="text-neutral-600">Emergency Response Portal</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg">
            <p className="text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="card-elevated p-8 space-y-6 border border-primary-200">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="label mb-2">
              Police Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@police.gov"
              required
              className="input"
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="label mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="input"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary-lg w-full disabled:opacity-50"
          >
            {isLoading ? 'Logging in...' : 'Login to Police Portal'}
          </button>
        </form>

        {/* Info Box */}
        <div className="mt-8 p-6 card-elevated border border-primary-200">
          <h3 className="text-neutral-900 font-semibold mb-3">About This Portal</h3>
          <ul className="space-y-2 text-neutral-600 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary-600">•</span>
              <span>Real-time SOS alert monitoring</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600">•</span>
              <span>GPS location tracking</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600">•</span>
              <span>Incident response coordination</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600">•</span>
              <span>Alert history and reporting</span>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <p className="text-center text-neutral-500 text-xs mt-8">
          For authorized law enforcement personnel only
        </p>
      </div>
    </div>
  );
}
