'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallback() {
  return (
    <Suspense>
      <AuthCallbackContent />
    </Suspense>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    const err = params.get('error');

    if (err) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(decodeURIComponent(err));
      return;
    }

    if (!token) {
      router.push('/login');
      return;
    }

    localStorage.setItem('access_token', token);
    document.cookie = 'logged_in=true; path=/; SameSite=Lax';
    router.push('/dashboard');
  }, [router, params]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="text-indigo-600 hover:underline text-sm"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Signing you in...</p>
    </div>
  );
}
