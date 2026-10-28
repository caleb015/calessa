import { Prisma } from '@prisma/client';

// Every WeddingEvent column except the deprecated `type`, so it never reaches the dashboard
// (whose save would echo it back) or the public site.
export const EVENT_SELECT = {
  id: true,
  tagline: true,
  title: true,
  venueName: true,
  address: true,
  startTime: true,
  endTime: true,
  mapUrl: true,
  notes: true,
  displayOrder: true,
  showOnHomepage: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WeddingEventSelect;
