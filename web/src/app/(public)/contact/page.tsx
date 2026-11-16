import { publicApi } from '@/lib/api';
import { RxEnvelopeClosed, RxMobile } from 'react-icons/rx';

export default async function ContactPage() {
  const contacts = await publicApi.getContact().catch(() => []);

  return (
    <div className="px-4 py-16">
      <div className="text-center mb-16">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)] mb-3">Get in Touch</p>
        <h1 className="text-4xl md:text-5xl font-serif">Contact</h1>
      </div>

      {contacts.length === 0 && (
        <p className="text-center text-[var(--muted)]">Contact details coming soon.</p>
      )}

      {/* Same layout as the homepage's events: open columns split by hairlines, no boxes. */}
      {contacts.length > 0 && (
        <div
          className={`mx-auto grid gap-px bg-[var(--border)] ${
            contacts.length === 1
              ? 'max-w-md'
              : contacts.length === 2
                ? 'max-w-3xl md:grid-cols-2'
                : 'max-w-5xl md:grid-cols-3'
          }`}
        >
          {contacts.map(person => (
            <div key={person.id} className="bg-[var(--background)] px-10 py-8 text-center">
              <h3 className="font-serif text-2xl mb-2">{person.name}</h3>
              {person.role && (
                <p className="text-[10px] text-[var(--accent)] uppercase tracking-[0.3em] mb-4">{person.role}</p>
              )}
              {person.email && (
                <p className="text-sm text-[var(--muted)]">
                  <a
                    href={`mailto:${person.email}`}
                    className="inline-flex items-center gap-1.5 hover:text-[var(--accent)] transition-colors break-all"
                  >
                    <RxEnvelopeClosed aria-hidden className="shrink-0" size={13} />
                    {person.email}
                  </a>
                </p>
              )}
              {person.phone && (
                <p className="text-sm text-[var(--muted)] mt-1">
                  <a
                    href={`tel:${person.phone}`}
                    className="inline-flex items-center gap-1.5 hover:text-[var(--accent)] transition-colors"
                  >
                    <RxMobile aria-hidden className="shrink-0" size={13} />
                    {person.phone}
                  </a>
                </p>
              )}
              {person.notes && (
                <p className="text-sm text-[var(--muted)] mt-4 italic">{person.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
