export default function Footer({ coupleNames }: { coupleNames?: string }) {
  return (
    <footer className="border-t border-[var(--border)] py-8 mt-16 text-center text-sm text-[var(--muted)]">
      <p className="font-serif text-base text-[var(--foreground)] mb-1">
        {coupleNames ?? 'Caleb & Raissa'}
      </p>
      <p>We can&apos;t wait to celebrate with you.</p>
    </footer>
  );
}
