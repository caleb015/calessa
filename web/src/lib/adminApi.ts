import { authFetch } from '@/lib/session';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// authFetch sends the login token and redirects to /login if the session has expired.
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await authFetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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

  // Image uploads (signature for a direct Cloudinary upload)
  getUploadSignature: () => post('/admin/uploads/signature', {}),

  // Preview (view the site while it is not public)
  createPreviewToken: () => post<{ token: string }>('/admin/preview-token', {}),
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
  sendGuestInvitation: (id: string) => post(`/admin/guests/${id}/send-invitation`, {}),

  // Details page + Dress Code
  getDetailsPage: () => get('/admin/details-page'),
  updateDetailsPage: (body: unknown) => patch('/admin/details-page', body),
  getDressCode: () => get('/admin/dress-code'),
  updateDressCode: (body: unknown) => patch('/admin/dress-code', body),
  getDressCodeGuidelines: () => get('/admin/dress-code-guidelines'),
  createDressCodeGuideline: (body: unknown) => post('/admin/dress-code-guidelines', body),
  updateDressCodeGuideline: (id: string, body: unknown) => patch(`/admin/dress-code-guidelines/${id}`, body),
  deleteDressCodeGuideline: (id: string) => del(`/admin/dress-code-guidelines/${id}`),

  // Invitation email template
  getInviteEmail: () => get('/admin/invite-email'),
  updateInviteEmail: (body: unknown) => patch('/admin/invite-email', body),
  previewInviteEmail: (body: unknown) => post('/admin/invite-email/preview', body),

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
  updateSeatingAssignment: (id: string, body: unknown) => patch(`/admin/seating/assignments/${id}`, body),
  deleteSeatingAssignment: (id: string) => del(`/admin/seating/assignments/${id}`),

  // Unassigned guests
  getUnassignedGuests: () => get('/admin/seating/unassigned'),

  // Events
  getEvents: () => get('/admin/events'),
  createEvent: (body: unknown) => post('/admin/events', body),
  updateEvent: (id: string, body: unknown) => patch(`/admin/events/${id}`, body),
  deleteEvent: (id: string) => del(`/admin/events/${id}`),

  // Schedule
  getSchedule: () => get('/admin/schedule'),
  createScheduleItem: (body: unknown) => post('/admin/schedule', body),
  updateScheduleItem: (id: string, body: unknown) => patch(`/admin/schedule/${id}`, body),
  deleteScheduleItem: (id: string) => del(`/admin/schedule/${id}`),

  // FAQs
  getFaqs: () => get('/admin/faqs'),
  createFaq: (body: unknown) => post('/admin/faqs', body),
  updateFaq: (id: string, body: unknown) => patch(`/admin/faqs/${id}`, body),
  deleteFaq: (id: string) => del(`/admin/faqs/${id}`),

  // Gallery
  getGallery: () => get('/admin/gallery'),
  createGalleryImage: (body: unknown) => post('/admin/gallery', body),
  updateGalleryImage: (id: string, body: unknown) => patch(`/admin/gallery/${id}`, body),
  deleteGalleryImage: (id: string) => del(`/admin/gallery/${id}`),

  // Story timeline
  getStoryTimeline: () => get('/admin/story-timeline'),
  createStoryItem: (body: unknown) => post('/admin/story-timeline', body),
  updateStoryItem: (id: string, body: unknown) => patch(`/admin/story-timeline/${id}`, body),
  deleteStoryItem: (id: string) => del(`/admin/story-timeline/${id}`),

  // Contact persons
  getContacts: () => get('/admin/contact'),
  createContact: (body: unknown) => post('/admin/contact', body),
  updateContact: (id: string, body: unknown) => patch(`/admin/contact/${id}`, body),
  deleteContact: (id: string) => del(`/admin/contact/${id}`),

  // CSV exports
  exportGuestsCsv: () => `${BASE_URL}/admin/export/guests.csv`,
  exportRsvpsCsv: () => `${BASE_URL}/admin/export/rsvps.csv`,
};
