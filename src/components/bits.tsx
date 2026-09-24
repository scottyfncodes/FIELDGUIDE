import type { ReactNode } from "react";
import type { Verdict } from "../data/types";
import { diffBucket } from "../lib/trails";
import { VERDICT_TEXT } from "../lib/weather";

const DIFF_CLASS = { Easy: "easy", Moderate: "mod", Hard: "hard", "Very Hard": "vhard" } as const;

export function DiffTag({ d }: { d: string }) {
  return <span className={"diff diff-" + DIFF_CLASS[diffBucket(d)]}>{d || "Unrated"}</span>;
}

export function VerdictChip({ v, small }: { v: Verdict | null; small?: boolean }) {
  if (!v) return small ? null : <span className="chip chip-na">No forecast yet</span>;
  return (
    <span className={"chip chip-" + v.toLowerCase()} title={VERDICT_TEXT[v]}>
      {small ? <><span className="sr-only">Weather: </span>{v}</> : VERDICT_TEXT[v]}
    </span>
  );
}

/* Read-only star display */
export function Stars({ n, max = 5, label }: { n: number; max?: number; label: string }) {
  return (
    <span className="stars" role="img" aria-label={`${label}: ${n} of ${max}`}>
      {Array.from({ length: max }, (_, i) => <span key={i} className={"star" + (i < n ? " on" : "")} aria-hidden="true">★</span>)}
    </span>
  );
}

/* Tappable rating: each star is a real button; tapping the current rating clears it */
export function RatingInput({ n, onSet }: { n: number; onSet: (n: number) => void }) {
  return (
    <div className="rating" role="group" aria-label="My rating">
      {Array.from({ length: 5 }, (_, i) => (
        <button key={i} type="button" className={"rate-star" + (i < n ? " on" : "")}
          aria-label={`${i + 1} star${i ? "s" : ""}`} aria-pressed={i + 1 === n}
          onClick={() => onSet(i + 1 === n ? 0 : i + 1)}>★</button>
      ))}
    </div>
  );
}

/* A chip that is really a native <select> — iOS gets its wheel picker, and the
   invisible select is 16px so Safari never zooms the page on focus. */
export function ChipSelect<T extends string>({ label, value, options, onChange, active, children }: {
  label: string; value: T; options: { key: T; label: string }[]; onChange: (v: T) => void;
  active?: boolean; children?: ReactNode;
}) {
  const cur = options.find((o) => o.key === value);
  return (
    <label className={"fchip fchip-select" + (active ? " fchip-on" : "")}>
      <span className="fchip-text">{children ?? cur?.label}</span>
      <span className="fchip-caret" aria-hidden="true">▾</span>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function ToggleChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={"fchip" + (on ? " fchip-on" : "")} aria-pressed={on} onClick={onClick}>
      {on && <span aria-hidden="true">✓ </span>}{children}
    </button>
  );
}
