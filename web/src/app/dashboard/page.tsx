'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { appConfig } from '@/config/app';

export default function Dashboard() {
  const [email, setEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/');
      return;
    }

    fetch(`${appConfig.apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then((user) => {
        setEmail(user.email);
        setIsVerifying(false);
      })
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_email');
        document.cookie = 'logged_in=; Max-Age=0; path=/';
        router.push('/');
      });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_email');
    document.cookie = 'logged_in=; Max-Age=0; path=/';
    router.push('/');
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Verifying session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/profile"
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Profile
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-700">Welcome, {email}!</p>
          <p className="text-gray-500 mt-2">Dashboard interface coming soon...</p>
        </div>
      </div>
    </div>
  );
}
