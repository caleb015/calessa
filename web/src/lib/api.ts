import type {
  WeddingSettings, WeddingEvent, ScheduleItem, FaqItem,
  GalleryImage, StoryTimelineItem, ContactPerson, RsvpGuest,
} from '@/types/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data?.message ?? 'Request failed');
  }
  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const publicApi = {
  getSettings: () => get<WeddingSettings>('/public/settings'),
  getStory: () => get<StoryTimelineItem[]>('/public/story'),
  getEvents: () => get<WeddingEvent[]>('/public/events'),
  getSchedule: () => get<ScheduleItem[]>('/public/schedule'),
  getFaqs: () => get<FaqItem[]>('/public/faqs'),
  getGallery: () => get<GalleryImage[]>('/public/gallery'),
  getContact: () => get<ContactPerson[]>('/public/contact'),
  getRsvpByCode: (code: string) => get<RsvpGuest>(`/public/rsvp/${code}`),
  submitRsvp: (code: string, body: unknown) => post<{ id: string; status: string }>(`/public/rsvp/${code}`, body),
};
