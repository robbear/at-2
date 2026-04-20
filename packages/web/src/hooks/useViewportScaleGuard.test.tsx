import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useViewportScaleGuard } from "./useViewportScaleGuard";

interface MockVisualViewport {
  scale: number;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

describe("useViewportScaleGuard", () => {
  let mockVV: MockVisualViewport;
  let metaEl: HTMLMetaElement;

  beforeEach(() => {
    mockVV = {
      scale: 1,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(window, "visualViewport", {
      value: mockVV,
      writable: true,
      configurable: true,
    });

    metaEl = document.createElement("meta");
    metaEl.name = "viewport";
    metaEl.content = "width=device-width, initial-scale=1";
    document.head.appendChild(metaEl);
  });

  afterEach(() => {
    if (metaEl.parentNode) metaEl.parentNode.removeChild(metaEl);
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // --- visualViewport.resize path ---

  it("registers a resize listener on visualViewport", () => {
    renderHook(() => useViewportScaleGuard());
    expect(mockVV.addEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  it("deregisters the resize listener on unmount", () => {
    const { unmount } = renderHook(() => useViewportScaleGuard());
    const registered = mockVV.addEventListener.mock.calls[0]![1] as EventListener;
    unmount();
    expect(mockVV.removeEventListener).toHaveBeenCalledWith("resize", registered);
  });

  it("does nothing when visualViewport is absent", () => {
    Object.defineProperty(window, "visualViewport", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(() => renderHook(() => useViewportScaleGuard())).not.toThrow();
  });

  it("pins then restores viewport meta when scale drifts from 1", () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });

    mockVV.scale = 2.5;
    renderHook(() => useViewportScaleGuard());

    const handler = mockVV.addEventListener.mock.calls[0]![1] as () => void;
    handler();

    expect(metaEl.content).toBe("width=device-width, initial-scale=1, maximum-scale=1");
    rafCallbacks.forEach((cb) => cb(0));
    expect(metaEl.content).toBe("width=device-width, initial-scale=1");
  });

  it("leaves viewport meta untouched when scale is already 1", () => {
    mockVV.scale = 1;
    renderHook(() => useViewportScaleGuard());

    const handler = mockVV.addEventListener.mock.calls[0]![1] as () => void;
    handler();

    expect(metaEl.content).toBe("width=device-width, initial-scale=1");
  });

  it("leaves viewport meta untouched when scale is within 0.01 of 1", () => {
    mockVV.scale = 1.009;
    renderHook(() => useViewportScaleGuard());

    const handler = mockVV.addEventListener.mock.calls[0]![1] as () => void;
    handler();

    expect(metaEl.content).toBe("width=device-width, initial-scale=1");
  });

  // --- orientationchange path ---

  it("registers an orientationchange listener on window", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    renderHook(() => useViewportScaleGuard());
    expect(addSpy).toHaveBeenCalledWith("orientationchange", expect.any(Function));
  });

  it("deregisters the orientationchange listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useViewportScaleGuard());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("orientationchange", expect.any(Function));
  });

  it("pins then restores viewport meta after orientationchange (unconditional, after 300 ms)", () => {
    vi.useFakeTimers();
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });

    // scale is 1 — confirms the reset is unconditional (not gated on scale check)
    mockVV.scale = 1;
    renderHook(() => useViewportScaleGuard());

    window.dispatchEvent(new Event("orientationchange"));

    // Before 300 ms: nothing has happened yet
    expect(metaEl.content).toBe("width=device-width, initial-scale=1");

    vi.advanceTimersByTime(300);

    // After 300 ms: meta pinned
    expect(metaEl.content).toBe("width=device-width, initial-scale=1, maximum-scale=1");

    // After rAF: original restored
    rafCallbacks.forEach((cb) => cb(0));
    expect(metaEl.content).toBe("width=device-width, initial-scale=1");
  });
});
