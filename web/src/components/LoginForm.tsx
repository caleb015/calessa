'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { appConfig } from '@/config/app';
import AuthProviderButtons from './AuthProviderButtons';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const submitAsync = async () => {
    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    const endpoint = isRegister ? '/auth/register' : '/auth/login';

    try {
      const res = await fetch(`${appConfig.apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        setError(msg || 'Something went wrong');
        return;
      }

      if (isRegister) {
        setSuccessMsg('Account created! You can now sign in.');
        setIsRegister(false);
        setPassword('');
        setConfirmPassword('');
        return;
      }

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user_email', email);
      document.cookie = 'logged_in=true; path=/; SameSite=Lax';
      router.push('/dashboard');
    } catch {
      setError('Unable to reach the server. Make sure the API is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    void submitAsync();
  };

  const toggleMode = () => {
    setIsRegister((prev) => !prev);
    setError('');
    setSuccessMsg('');
    setConfirmPassword('');
  };

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{appConfig.name}</h1>
      <p className="text-gray-600 mb-6">{appConfig.subtitle}</p>
      <AuthProviderButtons className="mb-4" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isRegister ? 8 : undefined}
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
              placeholder={isRegister ? 'Min. 8 characters' : '••••••••'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        {isRegister && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                placeholder="Repeat your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {successMsg && <p className="text-green-600 text-sm">{successMsg}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 text-white font-semibold py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading && (
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isLoading ? 'Signing in…' : isRegister ? 'Create Account' : 'Sign In'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 mt-4">
        {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          onClick={toggleMode}
          className="text-indigo-600 hover:underline font-medium"
        >
          {isRegister ? 'Sign In' : 'Register'}
        </button>
      </p>
    </div>
  );
}
