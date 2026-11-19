'use client';

import { RefObject, useEffect, useState } from 'react';
import { useUnsavedChangesWarning } from '@/lib/unsavedChanges';

/**
 * A "Save changes" button that floats at the bottom of the screen while there are unsaved changes and
 * the page's own Save button is out of view. When that button is on screen, nothing floats.
 * While there are unsaved changes, leaving the page asks first (see `useUnsavedChangesWarning`).
 */
export default function FloatingSaveButton({
  saveButton,
  dirty,
  onSave,
  disabled = false,
  label = 'Save changes',
}: {
  /** The page's own Save button; the floating one hides while it's visible. */
  saveButton: RefObject<HTMLElement | null>;
  /** Whether anything has changed since the last save. */
  dirty: boolean;
  onSave: () => void;
  disabled?: boolean;
  /** e.g. "Saving…" or "Waiting for upload…" while busy. */
  label?: string;
}) {
  // Assume the page's button is visible until we know otherwise (and where browsers can't tell us).
  const [saveButtonVisible, setSaveButtonVisible] = useState(true);
  useUnsavedChangesWarning(dirty);

  useEffect(() => {
    const el = saveButton.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => setSaveButtonVisible(entries.some(e => e.isIntersecting)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [saveButton, dirty]);

  if (!dirty || saveButtonVisible) return null;

  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      className="fixed z-40 right-6 bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex items-center gap-3 rounded-full bg-white border border-gray-200 shadow-lg pl-4 pr-1.5 py-1.5"
    >
      <span className="text-xs text-amber-600">Unsaved changes</span>
      <button
        type="button"
        onClick={onSave}
        disabled={disabled}
        className="bg-gray-900 text-white text-sm px-4 py-1.5 rounded-full hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {label}
      </button>
    </div>
  );
}
