import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PoliceLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/auth/login`, {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">👮</div>
          <h1 className="text-4xl font-bold text-white mb-2">Police Control</h1>
          <p className="text-slate-400">Emergency Response Portal</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg">
            <p className="text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg shadow-xl p-8 space-y-6">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
              Police Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@police.gov"
              required
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
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
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            {isLoading ? 'Logging in...' : 'Login to Police Portal'}
          </button>
        </form>

        {/* Info Box */}
        <div className="mt-8 p-6 bg-slate-800/50 rounded-lg border border-slate-700">
          <h3 className="text-slate-300 font-semibold mb-3">About This Portal</h3>
          <ul className="space-y-2 text-slate-400 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span>Real-time SOS alert monitoring</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span>GPS location tracking</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span>Incident response coordination</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span>Alert history and reporting</span>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-8">
          For authorized law enforcement personnel only
        </p>
      </div>
    </div>
  );
}
