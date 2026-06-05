import { publicApi } from '@/lib/api';
import { RxEnvelopeClosed, RxMobile } from 'react-icons/rx';

export default async function ContactPage() {
  const contacts = await publicApi.getContact().catch(() => []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)] mb-3">Get in Touch</p>
        <h1 className="text-4xl md:text-5xl font-serif">Contact</h1>
      </div>

      {contacts.length === 0 && (
        <p className="text-center text-[var(--muted)]">Contact details coming soon.</p>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {contacts.map(person => (
          <div key={person.id} className="p-8 border border-[var(--border)] bg-white">
            <h3 className="font-serif text-xl mb-1">{person.name}</h3>
            {person.role && (
              <p className="text-xs text-[var(--accent)] uppercase tracking-widest mb-4">{person.role}</p>
            )}
            <div className="space-y-2">
              {person.email && (
                <a
                  href={`mailto:${person.email}`}
                  className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <RxEnvelopeClosed size={14} />
                  {person.email}
                </a>
              )}
              {person.phone && (
                <a
                  href={`tel:${person.phone}`}
                  className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <RxMobile size={14} />
                  {person.phone}
                </a>
              )}
            </div>
            {person.notes && (
              <p className="text-sm text-[var(--muted)] mt-4 italic">{person.notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
