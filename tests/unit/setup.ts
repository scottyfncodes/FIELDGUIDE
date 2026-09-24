import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom gaps the app touches
Element.prototype.scrollIntoView = function () {};

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
  // default: the forecast request just hangs; tests that care stub their own
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
