'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminApi';

type Rsvp = {
  id: string;
  message: string | null;
  songRequest: string | null;
  submittedAt: string;
  guest: { primaryName: string };
};

type Tab = 'messages' | 'songs';

export default function MessagesPage() {
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('messages');

  useEffect(() => {
    adminApi.getRsvps()
      .then(data => setRsvps(data as Rsvp[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const messages = rsvps.filter(r => r.message);
  const songs = rsvps.filter(r => r.songRequest);

  const items = activeTab === 'messages' ? messages : songs;

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Messages &amp; Song Requests</h1>

      <div className="flex border-b border-gray-200 mb-6">
        {([
          { key: 'messages', label: 'Messages', count: messages.length },
          { key: 'songs', label: 'Song Requests', count: songs.length },
        ] as { key: Tab; label: string; count: number }[]).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            {!loading && (
              <span className={`ml-2 text-xs min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full ${
                activeTab === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-center py-12 text-sm text-gray-400">
          No {activeTab === 'messages' ? 'messages' : 'song requests'} yet.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map(r => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-sm font-medium text-gray-900">{r.guest.primaryName}</p>
                <p className="text-xs text-gray-400">
                  {new Date(r.submittedAt).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </p>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {activeTab === 'messages' ? r.message : r.songRequest}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
