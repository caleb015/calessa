'use client';

import { useEffect } from 'react';

// Warns before leaving a dashboard page with unsaved changes: reloading or closing the tab, following a
// link, the browser's Back button, or anything that asks `confirmLeave()` first (Logout, switching tabs).
// One set of listeners serves every form on the page, so two unsaved forms still ask only once.

export const LEAVE_MESSAGE = 'You have unsaved changes. Leave this page and lose them?';

const unsaved = new Set<symbol>();
/** Set once leaving is confirmed, so the way out isn't questioned again. */
let leaving = false;
let guardRemoval: number | null = null;
const GUARD = '__calessaUnsaved';

export function hasUnsavedChanges() {
  return unsaved.size > 0 && !leaving;
}

/** Asks before leaving when something is unsaved; true means go ahead. */
export function confirmLeave(): boolean {
  if (!hasUnsavedChanges()) return true;
  if (!window.confirm(LEAVE_MESSAGE)) return false;
  leaving = true;
  return true;
}

/** Asks before throwing away unsaved changes while staying on the page (e.g. switching tabs); true means go ahead. */
export function confirmDiscard(): boolean {
  return !hasUnsavedChanges() || window.confirm('You have unsaved changes. Discard them?');
}

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (!hasUnsavedChanges()) return;
  e.preventDefault();
  e.returnValue = ''; // older browsers need this to show their warning
}

/** Links within the site (Next.js moves between pages without unloading, so the browser won't ask). */
function onClick(e: MouseEvent) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return; // a full page load: the browser asks itself
  if (url.pathname === window.location.pathname && url.search === window.location.search) {
    // A jump within the page: scroll there without a new history step (which Back would then question).
    if (url.hash && hasUnsavedChanges()) {
      e.preventDefault();
      document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView();
      window.history.replaceState(window.history.state, '', url.href);
    }
    return;
  }
  if (!confirmLeave()) {
    e.preventDefault();
    e.stopPropagation();
  }
}

/**
 * The Back button. While something is unsaved, an extra history entry for this same page sits on top,
 * so Back first lands here (still on this page) and can ask.
 */
function onPopState() {
  if (leaving || unsaved.size === 0) return;
  if (confirmLeave()) window.history.back();
  else pushGuard();
}

function pushGuard() {
  window.history.pushState({ ...window.history.state, [GUARD]: true }, '', window.location.href);
}

function start() {
  leaving = false;
  window.addEventListener('beforeunload', onBeforeUnload);
  document.addEventListener('click', onClick, true);
  window.addEventListener('popstate', onPopState);
  // Still there from a moment ago (e.g. React re-running effects): keep it.
  if (guardRemoval != null) { window.clearTimeout(guardRemoval); guardRemoval = null; return; }
  pushGuard();
}

function stop() {
  window.removeEventListener('beforeunload', onBeforeUnload);
  document.removeEventListener('click', onClick, true);
  window.removeEventListener('popstate', onPopState);
  if (leaving) return; // on the way out: the page's history is moving on anyway
  // Saved (or the form closed): take the extra entry away again, so Back needs one press as usual.
  guardRemoval = window.setTimeout(() => {
    guardRemoval = null;
    if (unsaved.size === 0 && window.history.state?.[GUARD]) {
      // That step back is ours, not the Back button: keep it from asking, even if a form turns unsaved meanwhile.
      window.addEventListener('popstate', e => e.stopImmediatePropagation(), { once: true });
      window.history.back();
    }
  }, 0);
}

/** Turns the warning on while `dirty` is true. */
export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const id = Symbol('unsaved');
    unsaved.add(id);
    if (unsaved.size === 1) start();
    return () => {
      unsaved.delete(id);
      if (unsaved.size === 0) stop();
    };
  }, [dirty]);
}
