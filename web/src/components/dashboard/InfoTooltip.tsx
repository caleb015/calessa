'use client';

import { RxInfoCircled } from 'react-icons/rx';

export default function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex items-center group ml-1">
      <RxInfoCircled size={13} className="text-gray-400 hover:text-gray-600 cursor-help" />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 w-56 -translate-x-1/2 rounded-md bg-gray-900 px-2.5 py-1.5 text-center text-xs leading-snug text-white opacity-0 transition-opacity group-hover:opacity-100 z-10"
      >
        {text}
      </span>
    </span>
  );
}
