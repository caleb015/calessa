import type {
  WeddingSettings, WeddingEvent, ScheduleItem, FaqItem,
  GalleryImage, StoryTimelineItem, ContactPerson, RsvpGuest, DetailsPageContent,
  GalleryPage, GallerySettings, UploadSignature,
} from '@/types/api';
import { PREVIEW_HEADER, getPreviewToken } from '@/lib/preview';

/** Photos fetched at a time on the Gallery page. */
export const GALLERY_PAGE_SIZE = 48;

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function previewHeaders(): Promise<Record<string, string>> {
  const token = await getPreviewToken();
  return token ? { [PREVIEW_HEADER]: token } : {};
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { cache: 'no-store', headers: await previewHeaders() });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await previewHeaders()) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data?.message ?? 'Request failed');
  }
  return res.json();
}

/** A finished Cloudinary upload, as the API needs it to verify and save the photo. */
export interface UploadedImage {
  publicId: string;
  version: number;
  signature: string;
  format: string;
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
  getDetailsPage: () => get<DetailsPageContent>('/public/details-page'),
  calendarIcsUrl: `${BASE_URL}/public/calendar.ics`,
  getSchedule: () => get<ScheduleItem[]>('/public/schedule'),
  getFaqs: () => get<FaqItem[]>('/public/faqs'),
  getGallery: () => get<GalleryImage[]>('/public/gallery'),
  getGalleryPage: (offset = 0, limit = GALLERY_PAGE_SIZE) =>
    get<GalleryPage>(`/public/gallery/page?offset=${offset}&limit=${limit}`),
  getGallerySettings: () => get<GallerySettings>('/public/gallery-settings'),
  verifyGalleryCode: (code: string) => post<{ name: string }>('/public/gallery-uploads/verify', { code }),
  getGalleryUploadSignature: (code: string) => post<UploadSignature>('/public/gallery-uploads/signature', { code }),
  addGalleryUploads: (code: string, images: UploadedImage[]) =>
    post<{ added: number; pendingApproval: boolean }>('/public/gallery-uploads', { code, images }),
  getContact: () => get<ContactPerson[]>('/public/contact'),
  getRsvpByCode: (code: string) => get<RsvpGuest>(`/public/rsvp/${code}`),
  submitRsvp: (code: string, body: unknown) => post<{ id: string; status: string }>(`/public/rsvp/${code}`, body),
};
