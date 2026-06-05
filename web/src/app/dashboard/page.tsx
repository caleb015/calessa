'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/adminApi';

interface Summary {
  totalGuests: number;
  confirmed: number;
  declined: number;
  maybe: number;
  pending: number;
  totalHeadcount: number;
  plusOneCount: number;
  allergyCount: number;
  mealCounts: Record<string, number>;
  recentRsvps: Array<{
    id: string;
    status: string;
    submittedAt: string;
    guest: { primaryName: string };
  }>;
}

const statusColors: Record<string, string> = {
  ATTENDING: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',
  MAYBE: 'bg-yellow-100 text-yellow-700',
  PENDING: 'bg-gray-100 text-gray-600',
};

export default function DashboardOverview() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getSummary()
      .then(data => { setSummary(data as Summary); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading...</div>;
  if (error) return <div className="p-8 text-red-500 text-sm">{error}</div>;
  if (!summary) return null;

  const statCards = [
    { label: 'Total Guests', value: summary.totalGuests, href: '/dashboard/guests' },
    { label: 'Attending', value: summary.confirmed, color: 'text-green-600' },
    { label: 'Declined', value: summary.declined, color: 'text-red-500' },
    { label: 'Pending', value: summary.pending, color: 'text-yellow-600' },
    { label: 'Expected Headcount', value: summary.totalHeadcount },
    { label: 'Plus-ones', value: summary.plusOneCount },
    { label: 'Dietary Notes', value: summary.allergyCount },
    { label: 'Maybe', value: summary.maybe, color: 'text-yellow-500' },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Overview</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {statCards.map(({ label, value, color, href }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            {href ? (
              <Link href={href} className={`text-3xl font-semibold hover:underline ${color ?? 'text-gray-900'}`}>
                {value}
              </Link>
            ) : (
              <p className={`text-3xl font-semibold ${color ?? 'text-gray-900'}`}>{value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Meal counts */}
      {Object.keys(summary.mealCounts).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Meal Preferences</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(summary.mealCounts).map(([meal, count]) => (
              <div key={meal} className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm">
                <span className="text-gray-600">{meal}</span>
                <span className="ml-2 font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent RSVPs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-gray-700">Recent RSVPs</h2>
          <Link href="/dashboard/rsvps" className="text-xs text-gray-500 hover:text-gray-900">
            View all →
          </Link>
        </div>
        {summary.recentRsvps.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No RSVPs yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Guest</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Status</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentRsvps.map(rsvp => (
                <tr key={rsvp.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-900">{rsvp.guest.primaryName}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[rsvp.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {rsvp.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(rsvp.submittedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
