'use client';
import { useRef, useEffect, useCallback } from 'react';

/**
 * Reveal-on-scroll for [data-reveal] elements inside the returned ref.
 *
 * Two things this deliberately does NOT do:
 *
 * 1. It never removes the `revealed` class. An earlier version un-revealed on
 *    exit, which meant content you had already read vanished as you scrolled
 *    back up and re-animated every time. Reveal is one-way.
 *
 * 2. It never hides anything on its own. The stylesheet only applies the
 *    starting opacity when `html.has-reveal-observer` is set, which happens
 *    here in JS. If this script never runs - JS disabled, chunk failed, an
 *    extension blocking observers - the class is absent, the `[data-reveal]`
 *    rule never matches, and the content renders normally. Previously the
 *    hiding was unconditional in CSS, so a JS failure left whole marketing
 *    sections permanently invisible at opacity 0.
 */
export function useScrollReveal() {
  const rootRef = useRef<HTMLDivElement>(null);

  const setup = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;

    const targets = root.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!targets.length) return;

    document.documentElement.classList.add('has-reveal-observer');

    // No observer support, or the user asked for less motion: show
    // everything immediately rather than leaving it waiting on a scroll.
    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.classList.add('revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            // Stop watching once shown: one-way, and it stops the observer
            // doing work for every element on a long page.
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    targets.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove('has-reveal-observer');
    };
  }, []);

  useEffect(() => {
    const cleanup = setup();
    return () => cleanup?.();
  }, [setup]);

  return rootRef;
}