import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

/* most files run in jsdom; the serverless-function tests run in node and skip the DOM bits */
const dom = typeof window !== "undefined";

// jsdom gaps the app touches
if (dom) {
  Element.prototype.scrollIntoView = function () {};
  window.scrollTo = (() => {}) as typeof window.scrollTo;
}

beforeEach(() => {
  if (!dom) return;
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
  // default: the forecast request just hangs; tests that care stub their own
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
});

afterEach(() => {
  if (dom) cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
