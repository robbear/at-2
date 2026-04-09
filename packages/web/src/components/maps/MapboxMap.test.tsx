import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// Hoist mock functions so they are available inside the vi.mock() factory,
// which runs before module-level code (vitest hoist semantics).
// ---------------------------------------------------------------------------

const { mockFlyTo, mockGetBounds } = vi.hoisted(() => {
  const mockFlyTo = vi.fn();
  const mockGetBounds = vi.fn();
  return { mockFlyTo, mockGetBounds };
});

// ---------------------------------------------------------------------------
// Mock react-map-gl/mapbox. useImperativeHandle (a layout effect) sets the
// mapRef before any useEffect runs, so MapboxMap's selectedMarkerCoords
// effect always finds a populated ref.
// ---------------------------------------------------------------------------

vi.mock("react-map-gl/mapbox", () => ({
  default: React.forwardRef(function MockMap(
    {
      children,
      onLoad,
    }: {
      children?: React.ReactNode;
      onLoad?: () => void;
      [key: string]: unknown;
    },
    ref: React.ForwardedRef<unknown>,
  ) {
    React.useImperativeHandle(
      ref,
      () => ({
        getMap: () => ({
          getBounds: mockGetBounds,
          flyTo: mockFlyTo,
        }),
      }),
      [],
    );
    React.useEffect(() => {
      onLoad?.();
    }, []);
    return <div data-testid="mock-mapbox-map">{children}</div>;
  }),
  Marker: vi.fn(({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  )),
}));

vi.mock("mapbox-gl/dist/mapbox-gl.css", () => ({}));

vi.mock("./BaseMarker", () => ({
  BaseMarker: () => <div data-testid="base-marker" />,
}));

// Import AFTER mocks
import { MapboxMap } from "./MapboxMap";
import type { MarkerDot } from "./types";

const MARKERS: MarkerDot[] = [
  { id: "user/00000000000000001", lat: 37.77, lng: -122.42 },
];

function renderMap(selectedMarkerCoords?: { lat: number; lng: number }) {
  return render(
    <MapboxMap
      center={{ lat: 37.77, lng: -122.42 }}
      zoom={10}
      markers={MARKERS}
      selectedMarkerCoords={selectedMarkerCoords}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MapboxMap — selectedMarkerCoords", () => {
  it("does not call flyTo when selectedMarkerCoords is undefined", async () => {
    mockGetBounds.mockReturnValue({ contains: () => true });
    await act(async () => {
      renderMap(undefined);
    });
    expect(mockFlyTo).not.toHaveBeenCalled();
  });

  it("does not call flyTo when the marker is inside the current bounds", async () => {
    mockGetBounds.mockReturnValue({ contains: () => true });
    await act(async () => {
      renderMap({ lat: 37.77, lng: -122.42 });
    });
    expect(mockFlyTo).not.toHaveBeenCalled();
  });

  it("calls flyTo when the marker is outside the current bounds", async () => {
    mockGetBounds.mockReturnValue({ contains: () => false });
    await act(async () => {
      renderMap({ lat: 51.5, lng: -0.12 });
    });
    expect(mockFlyTo).toHaveBeenCalledWith({
      center: [-0.12, 51.5],
    });
  });

  it("does not pass zoom to flyTo (preserves current zoom)", async () => {
    mockGetBounds.mockReturnValue({ contains: () => false });
    await act(async () => {
      renderMap({ lat: 51.5, lng: -0.12 });
    });
    const call = mockFlyTo.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call).not.toHaveProperty("zoom");
  });
});
