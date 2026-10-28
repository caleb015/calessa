import type { CalendarInfo } from '@/types/api';
import { googleCalendarUrl } from '@/lib/details';

export default function AddToCalendar({ info, icsUrl }: { info: CalendarInfo; icsUrl: string }) {
  return (
    <details className="relative inline-block group">
      <summary className="list-none cursor-pointer text-xs text-[var(--foreground)]/70 underline underline-offset-4 hover:text-[var(--accent)] [&::-webkit-details-marker]:hidden">
        Add to Calendar
      </summary>
      <div className="absolute left-1/2 -translate-x-1/2 mt-2 z-10 w-56 bg-white border border-[var(--border)] shadow-sm text-left text-sm">
        <a href={googleCalendarUrl(info)} target="_blank" rel="noopener noreferrer" className="block px-4 py-2.5 hover:bg-[var(--surface)]">
          Google Calendar
        </a>
        <a href={icsUrl} className="block px-4 py-2.5 hover:bg-[var(--surface)] border-t border-[var(--border)]">
          Apple / Outlook (.ics)
        </a>
      </div>
    </details>
  );
}
