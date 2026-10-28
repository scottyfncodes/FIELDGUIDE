import { useCallback, useEffect, useState } from "react";

/* ---------- ROUTES ----------
   Everything lives in the URL hash so any screen can be shared and the back
   gesture works everywhere:
     #trail=greenmtn                 Explore + trail sheet (the original CO Trail
                                     Atlas share links keep working unchanged)
     #atlas                          a tab
     #atlas&species=quaking-aspen    a tab with a sheet over it
     #identify&at=trail:greenmtn     a tab with a parameter
     #found=cotrex:mesa:123          a trail from a live search (or a kept one)
     #identify&taxon=144815          a wildlife species page (iNaturalist taxon id)
   One sheet at a time; opening another pushes history, so back returns to
   the previous sheet. */
export type Tab = "explore" | "identify" | "atlas" | "quests";
export const TABS: Tab[] = ["explore", "identify", "atlas", "quests"];

export type SheetType = "trail" | "place" | "species" | "obs" | "guide" | "outing" | "found" | "taxon";
const SHEETS: SheetType[] = ["trail", "place", "species", "obs", "guide", "outing", "found", "taxon"];

export interface Route {
  tab: Tab;
  sheet: { type: SheetType; id: string } | null;
  params: Record<string, string>;
}

export function parseHash(hash: string): Route {
  const route: Route = { tab: "explore", sheet: null, params: {} };
  hash.replace(/^#/, "").split("&").filter(Boolean).forEach((part) => {
    const eq = part.indexOf("=");
    if (eq < 0) {
      if ((TABS as string[]).includes(part)) route.tab = part as Tab;
      return;
    }
    const k = part.slice(0, eq);
    let v = part.slice(eq + 1);
    try { v = decodeURIComponent(v); } catch { /* keep raw */ }
    if ((SHEETS as string[]).includes(k)) route.sheet = { type: k as SheetType, id: v };
    else route.params[k] = v;
  });
  return route;
}

export function formatHash(r: Route): string {
  const parts: string[] = [];
  if (r.tab !== "explore") parts.push(r.tab);
  if (r.sheet) parts.push(`${r.sheet.type}=${encodeURIComponent(r.sheet.id).replace(/%3A/g, ":")}`);
  Object.entries(r.params).forEach(([k, v]) => parts.push(`${k}=${encodeURIComponent(v).replace(/%3A/g, ":")}`));
  return parts.length ? `#${parts.join("&")}` : "";
}

export interface Nav {
  go: (r: Partial<Route>, opts?: { replace?: boolean }) => void;
  openSheet: (type: SheetType, id: string) => void;
  closeSheet: () => void;
  tab: (t: Tab) => void;
}

export function useRoute(): [Route, Nav] {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const sync = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  const go = useCallback((patch: Partial<Route>, opts: { replace?: boolean } = {}) => {
    const cur = parseHash(window.location.hash);
    const next: Route = { ...cur, ...patch, params: patch.params ?? (patch.tab && patch.tab !== cur.tab ? {} : cur.params) };
    const url = window.location.pathname + window.location.search + formatHash(next);
    if (formatHash(next) === formatHash(cur)) return;
    const depth = (window.history.state?.depth ?? 0) + (opts.replace ? 0 : 1);
    if (opts.replace) window.history.replaceState({ ...window.history.state, depth }, "", url);
    else window.history.pushState({ sheet: !!next.sheet, depth }, "", url);
    setRoute(next);
  }, []);

  const closeSheet = useCallback(() => {
    /* if we pushed this sheet, going back is what the user expects (and keeps
       history tidy); a sheet opened from a shared link just closes in place */
    if (window.history.state?.sheet && (window.history.state?.depth ?? 0) > 0) window.history.back();
    else go({ sheet: null }, { replace: true });
  }, [go]);

  const nav: Nav = {
    go,
    openSheet: useCallback((type: SheetType, id: string) => go({ sheet: { type, id } }), [go]),
    closeSheet,
    tab: useCallback((t: Tab) => go({ tab: t, sheet: null, params: {} }), [go]),
  };
  return [route, nav];
}
