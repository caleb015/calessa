export default function Footer({ coupleNames }: { coupleNames?: string }) {
  return (
    <footer className="relative z-20 mt-16 text-center text-sm bg-[var(--foreground)] shadow-[0_-8px_32px_rgba(0,0,0,0.8)]">
      <div className="py-6">
        <p className="font-serif text-base text-[var(--background)] mb-1">
          {coupleNames ?? 'Caleb & Raissa'}
        </p>
        <p className="text-[var(--muted)]">We can&apos;t wait to celebrate with you.</p>
      </div>
    </footer>
  );
}
