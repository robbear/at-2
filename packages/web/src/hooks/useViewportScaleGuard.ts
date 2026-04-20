"use client";

import { useEffect } from "react";

/**
 * Guards against iOS Safari leaving the visual viewport in a zoomed state
 * after exiting iframe fullscreen (e.g., YouTube). When `visualViewport.scale`
 * drifts from 1, briefly pins `maximum-scale=1` in the viewport meta tag to
 * force the browser to reset, then restores the original content.
 */
export function useViewportScaleGuard(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function handleResize(): void {
      if (Math.abs((window.visualViewport?.scale ?? 1) - 1) < 0.01) return;
      const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
      if (!meta) return;
      const original = meta.content;
      meta.content = "width=device-width, initial-scale=1, maximum-scale=1";
      requestAnimationFrame(() => {
        meta.content = original;
      });
    }

    vv.addEventListener("resize", handleResize);
    return () => {
      vv.removeEventListener("resize", handleResize);
    };
  }, []);
}
