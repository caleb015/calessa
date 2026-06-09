'use client';

import { useState } from 'react';
import { RxChevronDown } from 'react-icons/rx';
import type { FaqItem } from '@/types/api';

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="divide-y divide-[var(--border)] border-t border-b border-[var(--border)]">
      {items.map(item => {
        const isOpen = openIds.has(item.id);
        return (
          <div key={item.id}>
            <button
              className="w-full text-left py-4 flex justify-between items-start gap-4 group"
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
            >
              <span className="font-medium text-[var(--foreground)] leading-snug">{item.question}</span>
              <RxChevronDown
                className={`shrink-0 mt-0.5 text-[var(--muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                size={18}
              />
            </button>
            <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden">
                <p className="pb-4 text-[var(--muted)] leading-relaxed text-sm">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
