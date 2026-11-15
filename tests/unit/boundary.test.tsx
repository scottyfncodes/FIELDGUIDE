import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppBoundary, CrashCard, ErrorBoundary } from "../../src/components/ErrorBoundary";

/* A render error shows a card with the call button and a way back, never a
   blank page; and when the shell itself is what broke, the Safety guide can
   still be opened on its own. */

let broken = true;
function Flaky() {
  if (broken) throw new Error("boom on purpose");
  return <p>all good</p>;
}
const card = (error: Error, retry: () => void) => <CrashCard what="screen" error={error} onRetry={retry} onSafety={() => {}} />;

beforeEach(() => { broken = true; vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { vi.restoreAllMocks(); window.location.hash = ""; });

describe("error boundary", () => {
  it("shows the fallback with Call 911, a recovery action and what was reported", () => {
    render(<ErrorBoundary fallback={card}><Flaky /></ErrorBoundary>);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /this screen couldn't be drawn/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Call 911" }).getAttribute("href")).toBe("tel:911");
    expect(screen.getByRole("button", { name: "Open the Safety guide" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reload the app" })).toBeTruthy();
    expect(screen.getByText("boom on purpose")).toBeTruthy();
  });

  it("Try again draws the screen once the cause is gone", async () => {
    render(<ErrorBoundary fallback={card}><Flaky /></ErrorBoundary>);
    broken = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("all good")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("navigating away (a new resetKey) clears the error by itself", () => {
    const { rerender } = render(<ErrorBoundary resetKey="explore" fallback={card}><Flaky /></ErrorBoundary>);
    expect(screen.getByRole("alert")).toBeTruthy();
    broken = false;
    rerender(<ErrorBoundary resetKey="safety" fallback={card}><Flaky /></ErrorBoundary>);
    expect(screen.getByText("all good")).toBeTruthy();
  });

  it("leaves the Safety button out where the Safety guide is what failed", () => {
    render(<ErrorBoundary fallback={(e, retry) => <CrashCard what="safety" error={e} onRetry={retry} />}><Flaky /></ErrorBoundary>);
    expect(screen.getByRole("link", { name: "Call 911" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Open the Safety guide" })).toBeNull();
  });

  it("when the whole app fails, the Safety guide still opens on its own", async () => {
    render(<AppBoundary><Flaky /></AppBoundary>);
    expect(screen.getByRole("heading", { name: /field guide hit a problem/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Call 911" }).getAttribute("href")).toBe("tel:911");
    await userEvent.click(screen.getByRole("button", { name: "Open the Safety guide" }));
    expect(await screen.findByRole("heading", { name: /safety & survival/i })).toBeTruthy();
    expect(screen.getByText(/showing the safety guide only/i)).toBeTruthy();
    /* the guide works in this mode: a triage flow opens */
    await userEvent.click(screen.getByRole("button", { name: "Severe bleeding" }));
    expect(window.location.hash).toContain("flow=bleeding");
  });
});
