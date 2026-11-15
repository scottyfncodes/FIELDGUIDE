import { Component, useEffect, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { useRoute } from "../lib/router";
import { Safety } from "../screens/Safety";

/* ---------- WHEN A SCREEN BREAKS ----------
   A render error used to leave a blank page. Three layers now catch it:
     1. each tab and each sheet has its own boundary, so a broken Explore
        leaves the tab bar, and with it the Safety guide, working;
     2. a boundary around the whole app catches a broken shell and offers the
        Safety guide on its own, drawn without the shell that failed;
     3. if even that fails, a plain card with the call button and a reload.
   Every fallback keeps Call 911 on screen. None of them touches saved data. */

interface BoundaryProps {
  /** when this changes (the person navigated), the boundary tries its children again */
  resetKey?: string;
  fallback: (error: Error, retry: () => void) => ReactNode;
  children: ReactNode;
}

export class ErrorBoundary extends Component<BoundaryProps, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("Field Guide: a screen failed to render", error, info.componentStack);
  }

  componentDidUpdate(prev: BoundaryProps) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  retry = () => this.setState({ error: null });

  render() {
    return this.state.error ? this.props.fallback(this.state.error, this.retry) : this.props.children;
  }
}

const reload = () => window.location.reload();

/** The card every fallback shows: what happened, the call button, a way back. */
export function CrashCard({ what, error, onRetry, onSafety, onClose }: {
  what: "screen" | "sheet" | "app" | "safety";
  error: Error;
  onRetry?: () => void;
  /** omitted where the Safety guide is the thing that broke */
  onSafety?: () => void;
  onClose?: () => void;
}) {
  const title = what === "app" ? "Field Guide hit a problem" : what === "safety" ? "The Safety guide couldn't be drawn" : what === "sheet" ? "This page couldn't be drawn" : "This screen couldn't be drawn";
  return (
    <div className="screen crash" role="alert">
      {onClose && <button type="button" className="sa-back" onClick={onClose}><span aria-hidden="true">←</span> Back</button>}
      <p className="screen-eyebrow">Something went wrong</p>
      <h2 className="screen-title">{title}</h2>
      <p className="crash-lede">{what === "app" ? "An error stopped the app." : "An error stopped this part of the app."} Nothing you saved has been deleted. Try again, or reload the app.</p>

      <section className="sos-plate" aria-label="In an emergency">
        <p className="sos-plate-hd">In an emergency</p>
        <div className={"sos-plate-actions" + (onSafety ? "" : " crash-solo")}>
          <a className="call-btn" href="tel:911">Call 911</a>
          {onSafety && <button type="button" className="triage-btn" onClick={onSafety}>Open the Safety guide</button>}
        </div>
        <p className="sos-plate-note">If a life may be at risk, call 911 as soon as you can.</p>
      </section>

      <div className="id-actions crash-actions">
        {onRetry && <button type="button" className="pa-btn pa-primary" onClick={onRetry}>Try again</button>}
        <button type="button" className="pa-btn" onClick={reload}>Reload the app</button>
      </div>
      <details className="crash-details">
        <summary>What the app reported</summary>
        <p>{error.message || "No message."}</p>
      </details>
    </div>
  );
}

/* The Safety guide by itself: its own hash routing, none of the app shell.
   Used when the shell is what failed. */
function SafetyOnly() {
  const [route, nav] = useRoute();
  useEffect(() => {
    if (route.tab !== "safety") nav.go({ tab: "safety", sheet: null, params: {} }, { replace: true });
  }, []);
  return (
    <ErrorBoundary resetKey={JSON.stringify(route.params)} fallback={(error, retry) => <CrashCard what="safety" error={error} onRetry={retry} />}>
      <p className="crash-strip">
        Showing the Safety guide only.
        <button type="button" className="linkish" onClick={reload}>Reload the full app</button>
      </p>
      <Safety params={route.tab === "safety" ? route.params : {}} origin={null}
        go={(params, o) => nav.go({ tab: "safety", sheet: null, params }, o)} />
    </ErrorBoundary>
  );
}

function AppCrash({ error, retry }: { error: Error; retry: () => void }) {
  const [safetyOnly, setSafetyOnly] = useState(false);
  return (
    <div className="app app-bare" data-scene="safety">
      <header className="appbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">▲</span>
          <h1>Field Guide</h1>
        </div>
      </header>
      <main className="tab-body">
        {safetyOnly ? <SafetyOnly /> : <CrashCard what="app" error={error} onRetry={retry} onSafety={() => setSafetyOnly(true)} />}
      </main>
    </div>
  );
}

/** Wraps the whole app (see main.tsx). */
export function AppBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary fallback={(error, retry) => <AppCrash error={error} retry={retry} />}>{children}</ErrorBoundary>;
}
