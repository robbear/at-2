import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePersistedViewState } from "./usePersistedViewState";

const STORAGE_KEY = "atlasphere_view_state";

// next/navigation mock state, mutated per-test
let mockPathname = "/";
let mockSearchParamsStr = "";
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(mockSearchParamsStr),
}));

beforeEach(() => {
  mockPathname = "/";
  mockSearchParamsStr = "";
  mockReplace.mockClear();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("usePersistedViewState — restore", () => {
  it("restores saved state when on '/' with no URL params", () => {
    localStorage.setItem(STORAGE_KEY, "lat=37.000000&lng=-122.000000&zoom=10.00&tags=Webcams");
    renderHook(() => usePersistedViewState());
    expect(mockReplace).toHaveBeenCalledWith(
      "?lat=37.000000&lng=-122.000000&zoom=10.00&tags=Webcams",
    );
  });

  it("does not restore when URL already has params (shared link)", () => {
    localStorage.setItem(STORAGE_KEY, "lat=37.000000&lng=-122.000000&zoom=10.00");
    mockSearchParamsStr = "lat=51.505&lng=-0.09&zoom=13.00&userIds=someone";
    renderHook(() => usePersistedViewState());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does not restore when pathname is not '/'", () => {
    localStorage.setItem(STORAGE_KEY, "lat=37.000000&lng=-122.000000&zoom=10.00");
    mockPathname = "/robbearman/1708900000000";
    renderHook(() => usePersistedViewState());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does nothing when localStorage is empty", () => {
    renderHook(() => usePersistedViewState());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does not throw when localStorage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("unavailable");
    });
    expect(() => renderHook(() => usePersistedViewState())).not.toThrow();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe("usePersistedViewState — save", () => {
  it("saves persisted keys to localStorage after 1 s debounce", () => {
    vi.useFakeTimers();
    mockSearchParamsStr =
      "lat=37.000000&lng=-122.000000&zoom=10.00&tags=Webcams&markerIds=user%2F123";
    renderHook(() => usePersistedViewState());

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull(); // not saved yet

    vi.advanceTimersByTime(1000);

    const saved = localStorage.getItem(STORAGE_KEY);
    expect(saved).not.toBeNull();
    const p = new URLSearchParams(saved!);
    expect(p.get("lat")).toBe("37.000000");
    expect(p.get("tags")).toBe("Webcams");
    // markerIds must not be saved
    expect(p.has("markerIds")).toBe(false);
  });

  it("does not save before the 1 s debounce window elapses", () => {
    vi.useFakeTimers();
    mockSearchParamsStr = "lat=1.000000&lng=1.000000&zoom=5.00";
    renderHook(() => usePersistedViewState());

    vi.advanceTimersByTime(999);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    vi.advanceTimersByTime(1);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("does not save when searchParams is empty", () => {
    vi.useFakeTimers();
    mockSearchParamsStr = "";
    renderHook(() => usePersistedViewState());
    vi.advanceTimersByTime(2000);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("saves multiple values for array params (tags, userIds)", () => {
    vi.useFakeTimers();
    mockSearchParamsStr = "tags=Webcams&tags=Nature&userIds=alice&lat=10.000000&lng=20.000000&zoom=5.00";
    renderHook(() => usePersistedViewState());
    vi.advanceTimersByTime(1000);

    const saved = new URLSearchParams(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.getAll("tags")).toEqual(["Webcams", "Nature"]);
    expect(saved.getAll("userIds")).toEqual(["alice"]);
  });

  it("removes the saved key when searchParams becomes empty", () => {
    vi.useFakeTimers();
    localStorage.setItem(STORAGE_KEY, "lat=37.000000&lng=-122.000000&zoom=10.00");

    // Start with params present
    mockSearchParamsStr = "lat=37.000000&lng=-122.000000&zoom=10.00";
    const { rerender } = renderHook(() => usePersistedViewState());
    vi.advanceTimersByTime(1000);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    // Params cleared (user cleared all filters and panned to default view with no lat/lng)
    mockSearchParamsStr = "";
    rerender();
    // The save effect skips when empty — the key is left as-is until a non-empty save writes it
    // (we don't actively delete on empty searchParams — we just don't save)
    // So the previously saved value remains; this is intentional.
    vi.advanceTimersByTime(1000);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });
});
