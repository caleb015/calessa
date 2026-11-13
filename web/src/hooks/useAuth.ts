'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { appConfig } from '@/config/app';
import { clearPreviewCookie } from '@/lib/preview';
import { SessionExpiredError, authFetch } from '@/lib/session';

interface AuthUser {
  userId: string;
  email: string;
  name: string | null;
  hasPassword: boolean;
}

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Re-check the session on every dashboard page change, so a removed or expired login
  // sends the user to /login instead of leaving them on a page whose actions all fail.
  useEffect(() => {
    let cancelled = false;
    authFetch(`${appConfig.apiUrl}/auth/me`)
      .then(res => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then(data => { if (!cancelled) setUser(data); })
      .catch(err => {
        // Session problems already redirect to /login (keep showing "Loading" until then);
        // other errors (e.g. a network blip) keep the user where they are.
        if (err instanceof SessionExpiredError) cancelled = true;
        else console.warn('Could not verify session:', err);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pathname]);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_email');
    document.cookie = 'logged_in=; Max-Age=0; path=/';
    clearPreviewCookie();
    router.push('/login');
  };

  return { user, loading, logout };
}
