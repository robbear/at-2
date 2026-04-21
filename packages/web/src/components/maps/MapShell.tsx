"use client";

import {
  useCallback,
  startTransition,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode, ReactElement } from "react";
import {
  useSearchParams,
  useRouter,
  useParams,
  usePathname,
} from "next/navigation";
import dynamic from "next/dynamic";
import { ChevronUp, ChevronDown } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { selectProvider } from "@/lib/map/provider-select";
import { cn } from "@/lib/utils";
import { readSavedMapPosition } from "@/hooks/usePersistedViewState";
import { MarkerListPanel } from "@/components/markers/MarkerListPanel";
import type { MapProps, MarkerDot, MarkerListItem } from "./types";

const MapboxMap = dynamic<MapProps>(
  () =>
    import("@/components/maps/MapboxMap").then((m) => ({
      default: m.MapboxMap,
    })),
  { ssr: false },
);

const GoogleMap = dynamic<MapProps>(
  () =>
    import("@/components/maps/GoogleMap").then((m) => ({
      default: m.GoogleMap,
    })),
  { ssr: false },
);

const DEFAULT_LAT = 33.8337;
const DEFAULT_LNG = -60.8509;
const DEFAULT_ZOOM = 2;

// Splitter constraints (percentages of the available split axis).
const SPLIT_DEFAULT = 50;          // map pct in landscape (or desktop)
const SPLIT_PORTRAIT_DEFAULT = 30; // map pct in portrait — smaller map, more preview
const SPLIT_PREVIEW_MIN = 10; // preview cannot be smaller than this
const SPLIT_MAP_COLLAPSE = 5; // map at or below this → transition to detail view

interface MapShellProps {
  initialMarkers: MarkerDot[];
  markerListItems: MarkerListItem[];
  providerOverride?: string;
  defaultProvider?: string;
  defaultLat?: number;
  defaultLng?: number;
  defaultZoom?: number;
  children?: ReactNode;
}

export function MapShell({
  initialMarkers,
  markerListItems,
  providerOverride,
  defaultProvider,
  defaultLat = DEFAULT_LAT,
  defaultLng = DEFAULT_LNG,
  defaultZoom = DEFAULT_ZOOM,
  children,
}: MapShellProps): ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const ph = usePostHog();

  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const zoomParam = searchParams.get("zoom");
  const mpParam = searchParams.get("mp");
  const satellite = searchParams.get("maptype") === "1";

  const userId =
    typeof params["userId"] === "string" ? params["userId"] : undefined;
  const timestamp =
    typeof params["timestamp"] === "string" ? params["timestamp"] : undefined;

  const [mapCenter, setMapCenter] = useState(() => {
    if (latParam !== null) {
      return { lat: parseFloat(latParam), lng: parseFloat(lngParam ?? "0") };
    }
    if (userId && timestamp) {
      const markerId = `${userId}/${timestamp}`;
      const selected = initialMarkers.find((m) => m.id === markerId);
      if (selected) return { lat: selected.lat, lng: selected.lng };
    }
    // Bare load — initialize at saved position so the map's initial onMove
    // reports the right coords and doesn't overwrite the restored URL state.
    const saved = readSavedMapPosition();
    if (saved) return { lat: saved.lat, lng: saved.lng };
    return { lat: defaultLat, lng: defaultLng };
  });
  const [mapZoom, setMapZoom] = useState(() => {
    if (zoomParam !== null) return parseFloat(zoomParam);
    return readSavedMapPosition()?.zoom ?? defaultZoom;
  });

  // splitPct is the percentage of the available axis given to the MAP.
  // Initialized orientation-aware so portrait starts with a smaller map.
  const [splitPct, setSplitPct] = useState(() => {
    if (typeof window === "undefined") return SPLIT_DEFAULT;
    return window.matchMedia("(orientation: portrait)").matches
      ? SPLIT_PORTRAIT_DEFAULT
      : SPLIT_DEFAULT;
  });

  // listOpen: footer marker list is expanded (no URL change).
  const [listOpen, setListOpen] = useState(false);

  const provider = selectProvider(providerOverride, mpParam, defaultProvider);
  const hasMarker = Boolean(userId && timestamp);
  const isDetail = pathname?.endsWith("/detail") ?? false;
  const isEditor =
    (pathname?.endsWith("/edit") ?? false) || pathname === "/markers/new";
  const hasPreview = hasMarker && !isDetail && !isEditor;

  // Ref so handleMove can read the current route state without being in its
  // dependency array. Prevents the callback from being recreated on every
  // navigation and avoids a stale-closure loop when the map fires moveend
  // events while the container is resizing during a route transition.
  const isDetailRef = useRef(false);
  isDetailRef.current = isDetail;

  // Set to true the moment we call router.push toward the detail route so
  // handleMove is suppressed immediately — before pathname has updated.
  // isDetailRef alone isn't enough: the ResizeObserver can fire moveend in the
  // gap between the push call and the route actually changing.
  const navigatingToDetailRef = useRef(false);

  // Reset split to default whenever a new preview opens; also clear the
  // navigating flag so handleMove works normally if the user returns from detail.
  useEffect(() => {
    if (hasPreview) {
      const portrait = window.matchMedia("(orientation: portrait)").matches;
      setSplitPct(portrait ? SPLIT_PORTRAIT_DEFAULT : SPLIT_DEFAULT);
      navigatingToDetailRef.current = false;
    }
  }, [hasPreview, userId, timestamp]);

  // Close the list when navigating to a marker preview or detail.
  useEffect(() => {
    if (hasMarker) setListOpen(false);
  }, [hasMarker]);

  useEffect(() => {
    if (latParam !== null) return;
    if (!userId || !timestamp) return;
    const markerId = `${userId}/${timestamp}`;
    const marker = initialMarkers.find((m) => m.id === markerId);
    if (marker) {
      setMapCenter({ lat: marker.lat, lng: marker.lng });
    }
  }, [latParam, userId, timestamp, initialMarkers]);

  // Defined here (before handleMove) so the callback can read it without a
  // TypeScript "used before declaration" error. The splitter section below
  // sets/clears it; the orientation refs stay co-located with the splitter.
  const draggingRef = useRef(false);

  const handleMove = useCallback(
    (center: { lat: number; lng: number }, z: number) => {
      // Skip moveend events that are caused by the map container resizing, not
      // by the user panning or zooming:
      //   • draggingRef: splitter is active — container is resizing but the map
      //     is not being panned; updating lat/lng/zoom in the URL is wrong.
      //   • navigatingToDetailRef / isDetailRef: covers the window between
      //     router.push and the pathname actually updating, and the detail state
      //     itself. Without these, the ResizeObserver → resize() → moveend chain
      //     causes "Maximum update depth exceeded".
      if (
        draggingRef.current ||
        navigatingToDetailRef.current ||
        isDetailRef.current
      )
        return;
      setMapCenter(center);
      setMapZoom(z);
      startTransition(() => {
        const p = new URLSearchParams(searchParams.toString());
        // If the URL is still bare and saved state exists, the restore effect
        // navigation is in-flight but hasn't re-rendered this component yet.
        // Writing here with empty searchParams would produce a URL with only
        // lat/lng/zoom, stripping the QuerySpec params (tags, userIds, etc.)
        // before they arrive. Let the restore navigation win instead.
        // First-time users with no saved state are unaffected (null check).
        if (!p.toString() && readSavedMapPosition() !== null) return;
        p.set("lat", center.lat.toFixed(6));
        p.set("lng", center.lng.toFixed(6));
        p.set("zoom", z.toFixed(2));
        router.replace(`?${p.toString()}`);
      });
    },
    [router, searchParams],
  );

  const handleMarkerClick = useCallback(
    (markerId: string) => {
      ph?.capture("marker_click", { marker_id: markerId });
      const p = new URLSearchParams(searchParams.toString());
      router.push(`/${markerId}?${p.toString()}`);
    },
    [router, searchParams, ph],
  );

  const selectedMarkerId =
    userId && timestamp ? `${userId}/${timestamp}` : undefined;

  useEffect(() => {
    if (!selectedMarkerId || !userId) return;
    if (initialMarkers.some((m) => m.id === selectedMarkerId)) return;
    if (searchParams.getAll("userIds").includes(userId)) return;
    if (searchParams.getAll("markerIds").includes(selectedMarkerId)) return;
    const p = new URLSearchParams(searchParams.toString());
    p.append("markerIds", selectedMarkerId);
    startTransition(() => {
      router.replace(`?${p.toString()}`);
    });
  }, [selectedMarkerId, userId, initialMarkers, searchParams, router]);

  const selectedMarkerCoords = selectedMarkerId
    ? initialMarkers.find((m) => m.id === selectedMarkerId)
    : undefined;

  // Track preview panel open (fires once each time a new preview opens).
  const prevHasPreviewRef = useRef(false);
  useEffect(() => {
    if (hasPreview && !prevHasPreviewRef.current && selectedMarkerId) {
      ph?.capture("marker_preview_open", { marker_id: selectedMarkerId });
    }
    prevHasPreviewRef.current = hasPreview;
  }, [hasPreview, selectedMarkerId, ph]);

  const mapProps: MapProps = {
    center: mapCenter,
    zoom: mapZoom,
    markers: initialMarkers,
    satellite,
    onMove: handleMove,
    onMarkerClick: handleMarkerClick,
    selectedMarkerId,
    selectedMarkerCoords: selectedMarkerCoords
      ? { lat: selectedMarkerCoords.lat, lng: selectedMarkerCoords.lng }
      : undefined,
  };

  // -------------------------------------------------------------------------
  // Splitter drag logic
  // -------------------------------------------------------------------------

  const [isLandscape, setIsLandscape] = useState(false);
  const isLandscapeRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape)");
    isLandscapeRef.current = mq.matches;
    setIsLandscape(mq.matches);
    const onChange = (e: MediaQueryListEvent): void => {
      isLandscapeRef.current = e.matches;
      setIsLandscape(e.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const handleSplitterPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      draggingRef.current = true;
    },
    [],
  );

  const handleSplitterPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      let raw: number;
      if (isLandscapeRef.current) {
        raw = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        raw = ((e.clientY - rect.top) / rect.height) * 100;
      }

      const maxMapPct = 100 - SPLIT_PREVIEW_MIN;
      const clamped = Math.min(Math.max(raw, 0), maxMapPct);

      if (clamped <= SPLIT_MAP_COLLAPSE && selectedMarkerId) {
        draggingRef.current = false;
        navigatingToDetailRef.current = true; // suppress moveend before route updates
        const p = new URLSearchParams(searchParams.toString());
        router.push(`/${selectedMarkerId}/detail?${p.toString()}`);
        return;
      }

      setSplitPct(clamped);
    },
    [router, searchParams, selectedMarkerId],
  );

  const handleSplitterPointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  // -------------------------------------------------------------------------
  // Editor: skip persistent map entirely
  // -------------------------------------------------------------------------

  if (isEditor) {
    return (
      <div className="absolute inset-0 bg-surface overflow-auto">
        {children}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Layout
  // -------------------------------------------------------------------------

  const mapStyle = hasPreview
    ? isLandscape
      ? { width: `${splitPct}%`, height: "100%" }
      : { height: `${splitPct}%`, width: "100%" }
    : undefined;

  const previewStyle = hasPreview
    ? isLandscape
      ? { width: `${100 - splitPct}%`, height: "100%" }
      : { height: `${100 - splitPct}%`, width: "100%" }
    : undefined;

  const markerCount = markerListItems.length;
  const footerLabel = `${markerCount} marker${markerCount !== 1 ? "s" : ""}`;

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      {/* Content area: map + preview/detail + list overlay */}
      <div
        ref={containerRef}
        className={cn(
          "flex-1 relative min-h-0 overflow-hidden",
          hasPreview && "flex",
          hasPreview && (isLandscape ? "flex-row" : "flex-col"),
        )}
        onPointerMove={hasPreview ? handleSplitterPointerMove : undefined}
        onPointerUp={hasPreview ? handleSplitterPointerUp : undefined}
      >
        {/* Persistent map */}
        <div
          className={cn(
            "relative shrink-0",
            !hasPreview && !isDetail && "absolute inset-0",
            isDetail && "absolute inset-0 invisible",
          )}
          style={mapStyle}
        >
          {provider === "mapbox" ? (
            <MapboxMap {...mapProps} />
          ) : (
            <GoogleMap {...mapProps} />
          )}
        </div>

        {/* Drag handle — outer div is the touch target, inner pill is the visual */}
        {hasPreview && (
          <div
            className={cn(
              "shrink-0 flex items-center justify-center",
              "touch-none select-none z-20 bg-slate-100",
              "hover:bg-slate-200 active:bg-brand-blue/20 transition-colors",
              isLandscape
                ? "w-5 h-full cursor-col-resize"
                : "h-5 w-full cursor-row-resize",
            )}
            onPointerDown={handleSplitterPointerDown}
            role="separator"
            aria-label="Resize map and preview"
            aria-orientation={isLandscape ? "vertical" : "horizontal"}
          >
            <div
              className={cn(
                "rounded-full bg-slate-400 shrink-0",
                isLandscape ? "w-1 h-8" : "h-1 w-8",
              )}
            />
          </div>
        )}

        {/* Preview panel */}
        {hasPreview && (
          <div
            className="relative shrink-0 bg-surface overflow-auto shadow-lg border-slate-200"
            style={previewStyle}
          >
            {children}
          </div>
        )}

        {/* Detail overlay */}
        <div
          className={cn(
            "absolute inset-0 bg-surface overflow-auto z-10",
            "transition-opacity duration-300",
            isDetail ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          {isDetail && children}
        </div>

        {/* Marker list overlay — slides over the content area */}
        {listOpen && (
          <div className="absolute inset-0 z-30 bg-surface overflow-auto">
            <MarkerListPanel
              markers={markerListItems}
              onSelect={(id) => {
                setListOpen(false);
                handleMarkerClick(id);
              }}
            />
          </div>
        )}
      </div>

      {/* Footer — visible only in full map mode (no preview, no detail) */}
      {!isDetail && !hasPreview && (
        <button
          type="button"
          className={cn(
            "shrink-0 h-12 flex items-center justify-center gap-2 border-t transition-colors text-sm font-medium w-full",
            listOpen
              ? "bg-brand-blue text-white border-brand-blue hover:bg-brand-blue/90"
              : "bg-surface text-slate-600 border-slate-200 hover:bg-surface-muted",
          )}
          onClick={() => {
            if (!listOpen) ph?.capture("marker_list_open");
            setListOpen((o) => !o);
          }}
          aria-expanded={listOpen}
          aria-label={listOpen ? "Hide marker list" : "Show marker list"}
        >
          {listOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          {footerLabel}
        </button>
      )}
    </div>
  );
}
