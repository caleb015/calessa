'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { appConfig } from '@/config/app';

interface AuthUser {
  userId: string;
  email: string;
  name: string | null;
  hasPassword: boolean;
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch(`${appConfig.apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('access_token');
        document.cookie = 'logged_in=; Max-Age=0; path=/';
        router.push('/login');
      });
  }, [router]);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_email');
    document.cookie = 'logged_in=; Max-Age=0; path=/';
    router.push('/login');
  };

  return { user, loading, logout };
}
