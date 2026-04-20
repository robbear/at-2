"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const STORAGE_KEY = "atlasphere_view_state";

/**
 * Params that constitute the user's view state.
 * `markerIds` is intentionally excluded — it is ephemeral infrastructure
 * (used to surface a single marker that isn't in the current QuerySpec),
 * not a user preference worth restoring.
 */
const PERSIST_KEYS = [
  "lat",
  "lng",
  "zoom",
  "mp",
  "maptype",
  "tags",
  "allTags",
  "userIds",
  "near.lat",
  "near.lng",
  "near.distance",
  "dateRange.start",
  "dateRange.end",
  "dateRange.usePosttime",
] as const;

function readSaved(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // private browsing, storage quota, etc.
  }
}

/**
 * Reads the saved lat/lng/zoom from localStorage synchronously.
 * Intended for use inside `useState` lazy initializers in map components
 * so the map starts at the restored position rather than the defaults,
 * preventing the initial `onMove` from overwriting the restored URL state.
 * Returns null when localStorage is unavailable or has no saved position.
 */
export function readSavedMapPosition(): {
  lat: number;
  lng: number;
  zoom: number;
} | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const p = new URLSearchParams(saved);
    const lat = p.get("lat");
    const lng = p.get("lng");
    const zoom = p.get("zoom");
    if (!lat || !lng || !zoom) return null;
    return { lat: parseFloat(lat), lng: parseFloat(lng), zoom: parseFloat(zoom) };
  } catch {
    return null;
  }
}

function writeSaved(searchParams: URLSearchParams): void {
  const p = new URLSearchParams();
  for (const key of PERSIST_KEYS) {
    for (const val of searchParams.getAll(key)) {
      p.append(key, val);
    }
  }
  const str = p.toString();
  try {
    if (str) {
      localStorage.setItem(STORAGE_KEY, str);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // quota exceeded or unavailable
  }
}

/**
 * Persists the user's last view state (viewport + QuerySpec) to localStorage
 * and restores it when they return to a bare `/`.
 *
 * Restore rule: only if `pathname === "/"` AND the URL has no params.
 * A URL that already carries params is a shared/bookmarked link — it takes
 * full precedence over whatever is in localStorage.
 */
export function usePersistedViewState(): void {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Restore: runs once on mount.
  useEffect(() => {
    if (pathname !== "/") return;
    if (searchParams.toString()) return; // shared / bookmarked URL — don't override
    const saved = readSaved();
    if (saved) {
      router.replace(`?${saved}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — restore is a one-shot on app start

  // Save: debounced 1 s to avoid thrashing during map panning.
  useEffect(() => {
    if (!searchParams.toString()) return;
    const timer = setTimeout(() => writeSaved(searchParams), 1000);
    return () => clearTimeout(timer);
  }, [searchParams]);
}
