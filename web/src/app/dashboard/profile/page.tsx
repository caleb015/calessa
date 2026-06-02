'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { appConfig } from '@/config/app';

const OAUTH_PROVIDERS = ['google', 'facebook', 'x'] as const;
type OAuthProvider = typeof OAUTH_PROVIDERS[number];

interface LinkedProvider {
  provider: string;
  linkedAt: string;
}

interface UserProfile {
  userId: string;
  email: string;
  name: string | null;
  hasPassword: boolean;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const params = useSearchParams();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [linkedProviders, setLinkedProviders] = useState<LinkedProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Display Name state
  const [name, setName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password visibility state
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Delete Account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!token) { router.push('/'); return; }

    // Handle return from OAuth link flow
    const linked = params.get('linked');
    const error = params.get('error');
    if (linked) setBanner({ type: 'success', message: `${linked.charAt(0).toUpperCase() + linked.slice(1)} account connected successfully.` });
    if (error === 'provider_taken') setBanner({ type: 'error', message: 'That account is already linked to a different user.' });
    if (error === 'already_linked') setBanner({ type: 'error', message: 'That provider is already connected to your account.' });
    if (error === 'invalid_state') setBanner({ type: 'error', message: 'Link request expired. Please try again.' });
    if (error === 'link_failed') setBanner({ type: 'error', message: 'Failed to connect provider. Please try again.' });

    Promise.all([
      fetch(`${appConfig.apiUrl}/auth/me`, { headers: authHeaders }).then(r => r.json()),
      fetch(`${appConfig.apiUrl}/auth/providers`, { headers: authHeaders }).then(r => r.json()),
    ]).then(([me, providers]) => {
      setProfile(me);
      setName(me.name ?? '');
      setLinkedProviders(providers);
    }).catch(() => {
      router.push('/');
    }).finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveName = async () => {
    if (!name.trim()) {
      setNameMsg({ type: 'error', text: 'Display name cannot be empty.' });
      return;
    }
    setNameLoading(true);
    setNameMsg(null);
    try {
      const res = await fetch(`${appConfig.apiUrl}/auth/profile`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ name: name.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Failed to update name');
      setNameMsg({ type: 'success', text: 'Display name updated.' });
    } catch (err: any) {
      setNameMsg({ type: 'error', text: err.message });
    } finally {
      setNameLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setPasswordLoading(true);
    setPasswordMsg(null);
    try {
      const res = await fetch(`${appConfig.apiUrl}/auth/password`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Failed to update password');
      setPasswordMsg({ type: 'success', text: 'Password updated.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUnlink = async (provider: string) => {
    try {
      const res = await fetch(`${appConfig.apiUrl}/auth/providers/${provider}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Failed to unlink');
      setLinkedProviders(prev => prev.filter(p => p.provider !== provider));
      setBanner({ type: 'success', message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} account disconnected.` });
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message });
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await fetch(`${appConfig.apiUrl}/auth/profile`, { method: 'DELETE', headers: authHeaders });
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_email');
      document.cookie = 'logged_in=; Max-Age=0; path=/';
      router.push('/');
    } catch {
      setBanner({ type: 'error', message: 'Failed to delete account. Please try again.' });
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleConnect = async (provider: string) => {
    try {
      const res = await fetch(`${appConfig.apiUrl}/auth/link/${provider}`, { headers: authHeaders });
      if (!res.ok) throw new Error('Failed to get link URL');
      const { url } = await res.json();
      window.location.href = url;
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message });
    }
  };

  const isProviderLinked = (provider: string) => linkedProviders.some(p => p.provider === provider);
  const canUnlink = (provider: string) => {
    const hasOtherMethod = linkedProviders.length > 1 || profile?.hasPassword;
    return !!hasOtherMethod;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <Link href="/dashboard" className="text-sm text-indigo-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Banner */}
        {banner && (
          <div className={`rounded-lg px-4 py-3 text-sm font-medium ${banner.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {banner.message}
            <button className="ml-3 underline text-xs" onClick={() => setBanner(null)}>Dismiss</button>
          </div>
        )}

        {/* Account Info */}
        <section className="bg-white rounded-lg shadow p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Account Info</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p><span className="font-medium text-gray-700">Email:</span> {profile?.email}</p>

            <p><span className="font-medium text-gray-700">Member since:</span> {profile ? new Date(profile.createdAt).toLocaleDateString() : '—'}</p>
          </div>
        </section>

        {/* Display Name */}
        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Display Name</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setNameMsg(null); }}
              placeholder="Your display name"
              maxLength={100}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900"
            />
            <button
              onClick={handleSaveName}
              disabled={nameLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
            >
              {nameLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
          {nameMsg && (
            <p className={`text-sm ${nameMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {nameMsg.text}
            </p>
          )}
        </section>

        {/* Change Password */}
        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Password</h2>
          {!profile?.hasPassword ? (
            <p className="text-sm text-gray-500">
              No password set. Connect via one of your linked providers.
            </p>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => { setCurrentPassword(e.target.value); setPasswordMsg(null); }}
                  placeholder="Current password"
                  required
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showCurrent ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => { setNewPassword(e.target.value); setPasswordMsg(null); }}
                  placeholder="New password (min 8 characters)"
                  required
                  minLength={8}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
                />
                <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNew ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setPasswordMsg(null); }}
                  placeholder="Confirm new password"
                  required
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
              {passwordMsg && (
                <p className={`text-sm ${passwordMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordMsg.text}
                </p>
              )}
            </form>
          )}
        </section>

        {/* Connected Accounts */}
        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Connected Accounts</h2>
          <div className="space-y-3">
            {OAUTH_PROVIDERS.map((provider) => {
              const linked = isProviderLinked(provider);
              return (
                <div key={provider} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm font-medium text-gray-700 capitalize">{provider}</span>
                  {linked ? (
                    <button
                      onClick={() => handleUnlink(provider)}
                      disabled={!canUnlink(provider)}
                      className="text-sm text-red-600 hover:underline disabled:text-gray-400 disabled:no-underline"
                      title={!canUnlink(provider) ? 'Cannot remove your only login method' : undefined}
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(provider)}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      Connect
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-white rounded-lg shadow p-6 space-y-4 border border-red-200">
          <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
          <p className="text-sm text-gray-500">Permanently delete your account and all associated data. This cannot be undone.</p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
          >
            Delete My Account
          </button>
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Delete Account</h3>
            <p className="text-sm text-gray-600">
              This action is permanent and cannot be undone. Type your email address <strong>{profile?.email}</strong> to confirm.
            </p>
            <input
              type="email"
              value={deleteConfirmEmail}
              onChange={e => setDeleteConfirmEmail(e.target.value)}
              placeholder="Type your email to confirm"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm text-gray-900"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmEmail(''); }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmEmail !== profile?.email || deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
