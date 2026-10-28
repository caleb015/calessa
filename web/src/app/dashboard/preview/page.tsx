'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/adminApi';
import { setPreviewCookie } from '@/lib/preview';

const PAGES = [
  { path: '/', label: 'Home' },
  { path: '/story', label: 'Story' },
  { path: '/details', label: 'Details' },
  { path: '/schedule', label: 'Schedule' },
  { path: '/faq', label: 'FAQ' },
  { path: '/gallery', label: 'Gallery' },
  { path: '/contact', label: 'Contact' },
  { path: '/rsvp', label: 'RSVP' },
];

const REFRESH_MS = 60 * 60 * 1000; // token lasts 2h; renew hourly while the page is open

/** Gets a fresh preview token from the API and stores it in the preview cookie. */
async function startPreview() {
  const { token } = await adminApi.createPreviewToken();
  setPreviewCookie(token);
}

export default function PreviewPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [path, setPath] = useState('/');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    startPreview()
      .then(() => setReady(true))
      .catch(e => setError(e instanceof Error ? e.message : 'Could not start preview'));
    adminApi.getSettings()
      .then(s => setIsPublic((s as { isPublic: boolean }).isPublic))
      .catch(() => {});
    const id = setInterval(() => { startPreview().catch(() => {}); }, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-lg font-semibold text-gray-900 mr-2">Preview</h1>

        <div className="flex flex-wrap gap-1">
          {PAGES.map(p => (
            <button
              key={p.path}
              onClick={() => { setPath(p.path); setReloadKey(k => k + 1); }}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                path === p.path ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3 text-xs">
          {isPublic !== null && (
            isPublic ? (
              <span className="text-green-700">Site is public</span>
            ) : (
              <span className="text-amber-700">
                Site is hidden; visitors see Under Maintenance ·{' '}
                <Link href="/dashboard/settings" className="underline">Settings</Link>
              </span>
            )
          )}
          <button onClick={() => setReloadKey(k => k + 1)} className="text-gray-600 hover:text-gray-900">Reload</button>
          <a href={path} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-gray-900">Open in new tab ↗</a>
        </div>
      </div>

      <div className="flex-1 bg-gray-100">
        {error ? (
          <p className="p-6 text-sm text-red-600">{error}</p>
        ) : ready ? (
          <iframe key={reloadKey} src={path} title="Site preview" className="w-full h-full border-0 bg-white" />
        ) : (
          <p className="p-6 text-sm text-gray-400">Starting preview…</p>
        )}
      </div>
    </div>
  );
}
