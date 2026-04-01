import React, { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { LoginFormData } from '../../types/auth';
import { validateEmail } from '../../utils/validation';

interface LoginFormProps {
  onToggleForm: () => void;
}

export default function LoginForm({ onToggleForm }: LoginFormProps) {
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Partial<LoginFormData> = {};

    if (!validateEmail(formData.email)) {
      newErrors.email = 'Valid email is required';
    }
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(newErrors).length === 0) {
      // Simulate login - In a real app, this would make an API call
      login({
        id: '1',
        email: formData.email,
        firstName: 'John',
        lastName: 'Doe',
      });
    } else {
      setErrors(newErrors);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="label label-required">Email Address</label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
            <Mail className="h-5 w-5" />
          </div>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            className="input pl-12"
            placeholder="Enter your email"
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <span className="inline-block">⚠</span> {errors.email}
            </p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label label-required mb-0">Password</label>
          <a href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">Forgot?</a>
        </div>
        <div className="relative mt-2">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
            <Lock className="h-5 w-5" />
          </div>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="current-password"
            className="input pl-12"
            placeholder="Enter your password"
            aria-invalid={!!errors.password}
          />
          {errors.password && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <span className="inline-block">⚠</span> {errors.password}
            </p>
          )}
        </div>
      </div>

      <button
        type="submit"
        className="btn-primary-lg w-full justify-center"
      >
        Sign In
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-neutral-500">or</span>
        </div>
      </div>

      <div className="text-center pt-2">
        <p className="text-neutral-600 text-sm">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onToggleForm}
            className="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
          >
            Create account
          </button>
        </p>
      </div>
    </form>
  );
}