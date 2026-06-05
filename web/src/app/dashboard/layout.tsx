'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  RxDashboard, RxGear, RxPerson, RxEnvelopeClosed,
  RxTable, RxImage, RxCalendar, RxExit,
} from 'react-icons/rx';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: RxDashboard, exact: true },
  { href: '/dashboard/settings', label: 'Settings', icon: RxGear },
  { href: '/dashboard/guests', label: 'Guests', icon: RxPerson },
  { href: '/dashboard/rsvps', label: 'RSVPs', icon: RxEnvelopeClosed },
  { href: '/dashboard/seating', label: 'Seating', icon: RxTable },
  { href: '/dashboard/content', label: 'Content', icon: RxImage },
  { href: '/dashboard/messages', label: 'Messages', icon: RxCalendar },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-4 py-5 border-b border-gray-200">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-0.5">Admin</p>
          <p className="font-semibold text-gray-800 text-sm truncate">{user?.email}</p>
        </div>

        <nav className="flex-1 p-2">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-0.5 transition-colors ${
                  active
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-gray-200">
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors mb-0.5"
          >
            <RxPerson size={15} />
            Profile
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <RxExit size={15} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
