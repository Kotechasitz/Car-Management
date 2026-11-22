import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

function ignoreListener(): void {}

function createMediaQueryList(query: string): MediaQueryList {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: ignoreListener,
    removeListener: ignoreListener,
    addEventListener: ignoreListener,
    removeEventListener: ignoreListener,
    dispatchEvent: () => false,
  };
}

class SilentResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

Object.defineProperty(window, "matchMedia", { writable: true, value: createMediaQueryList });
Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  value: SilentResizeObserver,
});

afterEach(cleanup);
