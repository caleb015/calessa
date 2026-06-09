const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? `Request failed: ${res.status}`);
  }
  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json();
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) });
const patch = <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

export const adminApi = {
  // Settings
  getSettings: () => get('/admin/settings'),
  updateSettings: (body: unknown) => patch('/admin/settings', body),

  // Summary
  getSummary: () => get('/admin/summary'),

  // Guests
  getGuests: () => get('/admin/guests'),
  getGuest: (id: string) => get(`/admin/guests/${id}`),
  createGuest: (body: unknown) => post('/admin/guests', body),
  bulkCreateGuests: (body: unknown) => post('/admin/guests/bulk', body),
  updateGuest: (id: string, body: unknown) => patch(`/admin/guests/${id}`, body),
  deleteGuest: (id: string) => del(`/admin/guests/${id}`),

  // RSVPs
  getRsvps: () => get('/admin/rsvps'),
  updateRsvp: (id: string, body: unknown) => patch(`/admin/rsvps/${id}`, body),
  deleteRsvp: (id: string) => del(`/admin/rsvps/${id}`),

  // Seating tables
  getSeatingTables: () => get('/admin/seating/tables'),
  createSeatingTable: (body: unknown) => post('/admin/seating/tables', body),
  updateSeatingTable: (id: string, body: unknown) => patch(`/admin/seating/tables/${id}`, body),
  deleteSeatingTable: (id: string) => del(`/admin/seating/tables/${id}`),

  // Seating assignments
  getSeatingAssignments: () => get('/admin/seating/assignments'),
  createSeatingAssignment: (body: unknown) => post('/admin/seating/assignments', body),
  deleteSeatingAssignment: (id: string) => del(`/admin/seating/assignments/${id}`),

  // Unassigned guests
  getUnassignedGuests: () => get('/admin/seating/unassigned'),

  // CSV exports
  exportGuestsCsv: () => `${BASE_URL}/admin/export/guests.csv`,
  exportRsvpsCsv: () => `${BASE_URL}/admin/export/rsvps.csv`,
};
