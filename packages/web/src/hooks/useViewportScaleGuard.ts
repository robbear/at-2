"use client";

import { useEffect } from "react";

/**
 * Briefly pins `maximum-scale=1` in the viewport meta tag, then restores
 * the original value. This forces iOS Safari to reset a corrupted viewport
 * scale back to 1.
 */
function pinAndRestoreScale(): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) return;
  const original = meta.content;
  meta.content = "width=device-width, initial-scale=1, maximum-scale=1";
  requestAnimationFrame(() => {
    meta.content = original;
  });
}

/**
 * Guards against iOS Safari leaving the visual viewport in a zoomed state.
 * Two triggers are handled:
 *
 * 1. `visualViewport.resize` — scale drift after iframe fullscreen exit or
 *    similar events. Only resets when scale detectably differs from 1 (iOS
 *    correctly reports the scale in these cases).
 *
 * 2. `orientationchange` — device rotation can leave the page appearing zoomed
 *    even though `visualViewport.scale` still reports 1 (an iOS WebKit bug).
 *    Reset is unconditional, applied after the rotation animation (~300 ms).
 */
export function useViewportScaleGuard(): void {
  useEffect(() => {
    function handleVisualViewportResize(): void {
      if (Math.abs((window.visualViewport?.scale ?? 1) - 1) < 0.01) return;
      pinAndRestoreScale();
    }

    function handleOrientationChange(): void {
      setTimeout(pinAndRestoreScale, 300);
    }

    window.visualViewport?.addEventListener("resize", handleVisualViewportResize);
    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      window.visualViewport?.removeEventListener("resize", handleVisualViewportResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, []);
}
