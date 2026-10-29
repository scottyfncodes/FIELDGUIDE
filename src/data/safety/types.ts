/* ---------- SAFETY CONTENT TYPES ----------
   The Safety & Survival reference is data, kept apart from the screens that
   draw it. Articles are a short list of blocks; triage flows are the SOS
   decision trees, node by node. */

export type Run = string | { b: string };
export type ListItem = string | { lead: string; text: string };
export type Figure = "leanto" | "debris" | "shadow" | "dipper";

export type Block =
  | { t: "h"; text: string }
  | { t: "p"; text: string }
  | { t: "p"; runs: Run[] }
  | { t: "steps"; items: string[] }
  | { t: "list"; items: ListItem[] }
  | { t: "warn"; title: string; items: string[] }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "figure"; fig: Figure }
  | { t: "strobe" };

export interface Section { title: string; anchor?: string; blocks: Block[] }

export interface Article {
  id: string;
  title: string;
  blurb: string;
  sections: Section[];
}

export type Severity = "mild" | "moderate" | "severe" | "info";

export interface MenuNode { type: "menu"; title: string; items: { label: string; go: string }[] }
export interface QuestionNode { type: "q"; text: string; options: { label: string; next: string; flow?: string }[] }
export interface ResultNode {
  type: "result";
  severity: Severity;
  title: string;
  steps: string[];
  notdo?: string[];
  /** show the call box even when the severity isn't "severe" */
  forceCall?: boolean;
}
export type TriageNode = MenuNode | QuestionNode | ResultNode;
export type TriageFlows = Record<string, Record<string, TriageNode>>;
