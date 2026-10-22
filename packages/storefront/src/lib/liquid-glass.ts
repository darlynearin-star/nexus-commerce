'use client';
import { useEffect } from 'react';

/**
 * Cursor-tracked specular highlight for glass surfaces.
 *
 * Writes only two custom properties (--gx / --gy) on whichever surface is under
 * the cursor. The gradient itself lives in CSS, so the browser repaints one
 * small gradient instead of re-running layout.
 *
 * Three things keep this cheap:
 *  - one delegated listener on document, never per-element handlers;
 *  - the bounding rect is cached and only re-measured when the hovered element
 *    changes or the page scrolls, so pointermove never forces a reflow;
 *  - writes are coalesced into a single requestAnimationFrame per frame.
 *
 * Skipped entirely on coarse pointers and on touch-first devices, where there
 * is no hover to trigger it.
 */
const SELECTOR = '.glass, .glass-panel, .glass-edge, .card, .btn';

export function useLiquidGlass(): void {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let current: HTMLElement | null = null;
    let rect: DOMRect | null = null;
    let frame = 0;
    let pending: { x: number; y: number } | null = null;

    const clear = () => {
      if (current) {
        current.style.removeProperty('--gx');
        current.style.removeProperty('--gy');
      }
      current = null;
      rect = null;
      pending = null;
    };

    const flush = () => {
      frame = 0;
      if (!current || !pending) return;
      current.style.setProperty('--gx', `${pending.x}px`);
      current.style.setProperty('--gy', `${pending.y}px`);
      pending = null;
    };

    const onPointer = (event: PointerEvent) => {
      const target = (event.target as Element | null)?.closest?.(SELECTOR) as HTMLElement | null | undefined;

      if (target !== current) {
        clear();
        if (!target) return;
        current = target;
        rect = target.getBoundingClientRect();
      }

      if (!current || !rect) return;
      pending = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      if (!frame) frame = window.requestAnimationFrame(flush);
    };

    const refreshRect = () => {
      if (current) rect = current.getBoundingClientRect();
    };

    document.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('pointerdown', onPointer, { passive: true });
    window.addEventListener('scroll', refreshRect, { passive: true });
    window.addEventListener('resize', refreshRect, { passive: true });

    return () => {
      document.removeEventListener('pointermove', onPointer);
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('scroll', refreshRect);
      window.removeEventListener('resize', refreshRect);
      if (frame) window.cancelAnimationFrame(frame);
      clear();
    };
  }, []);
}
