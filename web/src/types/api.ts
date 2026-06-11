export interface WeddingSettings {
  coupleNameA: string;
  coupleNameB: string;
  weddingDate: string | null;
  siteTitle: string | null;
  siteDescription: string | null;
  heroImageUrl: string | null;
  welcomeMessage: string | null;
  isPublic: boolean;
  isRsvpEnabled: boolean;
  allowMaybe: boolean;
  enableMealPreference: boolean;
  enableSongRequest: boolean;
  enableGuestbook: boolean;
}

export interface WeddingEvent {
  id: string;
  type: string;
  title: string;
  venueName: string | null;
  address: string | null;
  startTime: string | null;
  endTime: string | null;
  mapUrl: string | null;
  notes: string | null;
  displayOrder: number;
}

export interface ScheduleItem {
  id: string;
  timeLabel: string;
  title: string;
  description: string | null;
  location: string | null;
  displayOrder: number;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  displayOrder: number;
  isPublished: boolean;
}

export interface GalleryImage {
  id: string;
  title: string | null;
  description: string | null;
  imageUrl: string;
  displayOrder: number;
}

export interface StoryTimelineItem {
  id: string;
  dateLabel: string | null;
  title: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
}

export interface ContactPerson {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  displayOrder: number;
}

export interface RsvpGuest {
  id: string;
  primaryName: string;
  allowedPartySize: number;
  plusOneAllowed: boolean;
  requiresMealSelection: boolean;
  rsvp: RsvpRecord | null;
}

export interface RsvpRecord {
  id: string;
  status: 'PENDING' | 'ATTENDING' | 'DECLINED' | 'MAYBE';
  attendeeCount: number;
  email: string | null;
  phone: string | null;
  plusOneName: string | null;
  mealPreference: string | null;
  dietaryRestrictions: string | null;
  message: string | null;
  songRequest: string | null;
}
