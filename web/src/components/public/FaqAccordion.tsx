'use client';

import { useState } from 'react';
import { RxChevronDown } from 'react-icons/rx';
import type { FaqItem } from '@/types/api';

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="divide-y divide-[var(--border)] border-t border-b border-[var(--border)]">
      {items.map(item => (
        <div key={item.id}>
          <button
            className="w-full text-left py-4 flex justify-between items-start gap-4 group"
            onClick={() => setOpenId(openId === item.id ? null : item.id)}
            aria-expanded={openId === item.id}
          >
            <span className="font-medium text-[var(--foreground)] leading-snug">{item.question}</span>
            <RxChevronDown
              className={`shrink-0 mt-0.5 text-[var(--muted)] transition-transform ${openId === item.id ? 'rotate-180' : ''}`}
              size={18}
            />
          </button>
          {openId === item.id && (
            <p className="pb-4 text-[var(--muted)] leading-relaxed text-sm">{item.answer}</p>
          )}
        </div>
      ))}
    </div>
  );
}
