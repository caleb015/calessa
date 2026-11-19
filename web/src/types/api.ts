export interface WeddingSettings {
  coupleNameA: string;
  coupleNameB: string;
  weddingDate: string | null;
  siteTitle: string | null;
  siteDescription: string | null;
  heroImageUrl: string | null;
  heroImageOffsetX: number | null;
  heroImageOffsetY: number | null;
  heroImageHeight: number | null;
  heroMobileImageUrl?: string | null;
  heroMobileImageOffsetY?: number | null;
  heroTextAlign?: string | null;
  heroTextOffset?: string | null;
  heroTextOffsetY?: string | null;
  heroMobileTextOffsetY?: string | null;
  monogramUrl: string | null;
  rsvpTagline: string | null;
  rsvpSubtext: string | null;
  themeBackground: string | null;
  themeForeground: string | null;
  themeMuted: string | null;
  themeAccent: string | null;
  themeBorder: string | null;
  themeSurface: string | null;
  themeInverseBackground: string | null;
  themeOverlayText: string | null;
  themeOverlayScrim: string | null;
  welcomeMessage: string | null;
  rsvpHeading?: string | null;
  fontHeading?: string | null;
  fontHeadingUrl?: string | null;
  fontBody?: string | null;
  fontBodyUrl?: string | null;
  fontAccent?: string | null;
  fontAccentUrl?: string | null;
  fontHero?: string | null;
  fontHeroUrl?: string | null;
  welcomeImageUrl?: string | null;
  rsvpBannerImageUrl?: string | null;
  isPublic: boolean;
  isRsvpEnabled: boolean;
  allowMaybe: boolean;
  enableMealPreference: boolean;
  enableSongRequest: boolean;
  enableGuestbook: boolean;
  /** True when the request carried a valid admin preview token. */
  preview?: boolean;
}

export interface WeddingEvent {
  id: string;
  tagline: string | null;
  title: string;
  venueName: string | null;
  address: string | null;
  startTime: string | null;
  endTime: string | null;
  mapUrl: string | null;
  notes: string | null;
  displayOrder: number;
  showOnHomepage: boolean;
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
  /** Name of the guest who shared it (guest uploads only). */
  sharedBy?: string | null;
}

/** One page of the homepage's Moments photos. `seed` (when in random order) keeps later pages in the same shuffle. */
export interface HomepageGalleryPage {
  images: GalleryImage[];
  total: number;
  seed: number | null;
}

/** One page of the public gallery. */
export interface GalleryPage {
  images: GalleryImage[];
  /** Number of published photos in the whole gallery. */
  total: number;
}

/** Guest photo sharing on the Gallery page. */
export interface GallerySettings {
  uploadsEnabled: boolean;
  requireApproval: boolean;
  heading: string;
  subtext: string;
  buttonLabel: string;
}

/** Signed parameters for one direct-to-Cloudinary upload. */
export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  signature: string;
  timestamp: number;
  folder: string;
  allowed_formats: string;
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
  email: string | null;
  phone: string | null;
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

export interface CalendarInfo {
  title: string;
  location: string | null;
  description: string;
  allDay: boolean;
  /** ISO timestamp, or YYYY-MM-DD when allDay. */
  start: string;
  /** Exclusive end: ISO timestamp, or the next day when allDay. */
  end: string;
}

export interface DressCodeGuideline {
  id: string;
  label: string;
  text: string;
  note: string | null;
  /** Example outfit photos. */
  imageUrls: string[];
}

export interface DetailsPageContent {
  header: { eyebrow: string; title: string; location: string | null };
  calendar: CalendarInfo | null;
  cta: { heading: string; subtext: string; buttonLabel: string } | null;
  dressCode: {
    eyebrow: string | null;
    title: string | null;
    intro: string | null;
    palette: string[];
    /** Section photos shown under the intro. */
    imageUrls: string[];
    guidelines: DressCodeGuideline[];
  } | null;
}
