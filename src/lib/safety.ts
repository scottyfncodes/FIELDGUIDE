import { ARTICLES, QUICK_REF, TRIAGE } from "../data/safety/sos";
import type { Article, Block, ResultNode, TriageNode } from "../data/safety/types";
import { loadKey, saveKey } from "./storage";

/* ---------- SAFETY & SURVIVAL: lookups, search, saved topics ----------
   Everything here runs on the device against the bundled reference, so it
   works with no signal. Routes are hash params on the Safety tab:
     #safety                       the index
     #safety&topic=weather         an article (or "firstaid", "quick", "print")
     #safety&topic=weather&sec=2   ...scrolled to its third section
     #safety&flow=bleeding         a triage flow at its first node
     #safety&flow=bleeding:severe  ...at a given node */

export const articleById = (id: string): Article | undefined => ARTICLES.find((a) => a.id === id);

/** The situations on SOS's "What's the situation?" menu, in its order. */
export const SITUATIONS: { flow: string; label: string }[] = (TRIAGE.entry.start as Extract<TriageNode, { type: "menu" }>).items
  .map((i) => ({ flow: i.go.split(":")[0], label: i.label }));
export const situationLabel = (flow: string) => SITUATIONS.find((s) => s.flow === flow)?.label ?? flow;

/** "bleeding" or "bleeding:severe" -> the node, or null when either part is unknown. */
export function triageNode(ref: string): { flow: string; node: string; n: TriageNode } | null {
  const [flow, node = "start"] = ref.split(":");
  const n = TRIAGE[flow]?.[node];
  return n ? { flow, node, n } : null;
}

/** A result node gets the call-for-help box when SOS gave it one: severe, or forced. */
export const needsCall = (n: ResultNode) => n.severity === "severe" || !!n.forceCall;

/* ---------- search ---------- */
export interface SafetyHit {
  kind: "situation" | "article" | "section" | "quick";
  title: string;
  /** where the hit sits, e.g. the article name */
  where: string;
  route: Record<string, string>;
}

interface Entry extends SafetyHit { title_l: string; kw: string; body: string; boost: number }

const blockText = (b: Block): string => {
  switch (b.t) {
    case "h": return b.text;
    case "p": return "text" in b ? b.text : b.runs.map((r) => (typeof r === "string" ? r : r.b)).join("");
    case "steps": return b.items.join(" ");
    case "list": return b.items.map((i) => (typeof i === "string" ? i : `${i.lead} ${i.text}`)).join(" ");
    case "warn": return `${b.title} ${b.items.join(" ")}`;
    case "table": return [...b.head, ...b.rows.flat()].join(" ");
    default: return "";
  }
};
const nodeText = (n: TriageNode): string =>
  n.type === "menu" ? `${n.title} ${n.items.map((i) => i.label).join(" ")}`
  : n.type === "q" ? `${n.text} ${n.options.map((o) => o.label).join(" ")}`
  : `${n.title} ${n.steps.join(" ")} ${(n.notdo ?? []).join(" ")}`;
const norm = (s: string) => s.toLowerCase().replace(/['’]/g, "");

/* Plain-language words people actually type, carried over from SOS's search index. */
const SITUATION_WORDS: Record<string, string> = {
  breathing: "cpr chest compressions rescue breaths cardiac arrest aed cant breathe not breathing unresponsive",
  fracture: "broken arm leg wrist ankle limb fracture splint sprain",
  cardiac: "cardiac chest pain pressure arm jaw heart attack",
  breathing_distress: "asthma wheezing shortness of breath inhaler cant breathe cant catch my breath",
  poison: "poison control swallowed ingested overdose chemical",
  fireemergency: "structure fire building on fire clothing on fire stop drop roll wildfire",
  vehicleemergency: "car stuck crash breakdown submerged roadside stranded vehicle",
  lost: "stop think observe plan search and rescue lost hiking lost in the woods stranded",
  waterincident: "drowning water rescue reach throw dont go",
  bleeding: "blood cut bad cut bleeding badly wound gash laceration tourniquet tourniquets",
  snakebite: "snake snakes bitten snakebite venom fangs bitten by a snake rattlesnake animal bite",
  burns: "burned burning scald scalded hot",
  hypothermia: "freezing cold hypothermic shivering exposure",
  seizure: "seizures convulsion convulsing epilepsy shaking fit",
  electrical: "electrocuted electrocution shock power line downed wire",
  frostbite: "frostbitten numb white waxy skin cold fingers toes",
  headspinal: "concussion head injury neck back injury fall hit head",
  heat: "heat stroke heat exhaustion overheating hot",
  dehydration: "dehydrated thirsty no water",
  shock: "pale cold clammy rapid pulse",
  allergic: "anaphylaxis epipen epinephrine bee sting hives swelling allergy",
  choking: "heimlich choke airway",
  other: "help emergency",
};
const ARTICLE_WORDS: Record<string, string> = {
  water: "bleach drops tablets gallons liters boil filter purify thirsty out of water find water",
  shelter: "build steps diagram insulation lean-to debris hut",
  fire: "fire starting ferro rod matches lighter tinder kindling bow drill extinguish",
  nav: "find north sun stick shadow polaris stars pointer big dipper waxing waning moon compass direction",
  signal: "sos distress whistle mirror light morse ground to air symbols v x strobe flashlight rescue",
  weather: "lightning 30-30 thunder storm flash flood moving water crossing heat cold wind chill tornado",
  wildlife: "bear black bear grizzly spray play dead snake mountain lion cougar ticks lyme sting",
  vehicle: "car stranded snow engine exhaust breakdown flares stuck mud sand overheating radiator submerged",
  hazards: "wildfire smoke evacuation earthquake drop cover hold on aftershock landslide mudslide debris flow rockfall",
};

let INDEX: Entry[] | null = null;
function buildIndex(): Entry[] {
  const out: Entry[] = [];
  const add = (e: Omit<Entry, "title_l">) => out.push({ ...e, title_l: norm(e.title), kw: norm(e.kw), body: norm(e.body) });
  SITUATIONS.forEach(({ flow, label }) => add({
    kind: "situation", title: label, where: "Emergency triage", route: { flow }, boost: 25,
    kw: `${label} triage first aid ${SITUATION_WORDS[flow] ?? ""}`,
    body: Object.values(TRIAGE[flow] ?? {}).map(nodeText).join(" "),
  }));
  add({ kind: "article", title: "Pressure bandaging", where: "First aid", route: { topic: "firstaid" }, boost: 0, kw: "bandage bleeding dressing wrap", body: "" });
  add({ kind: "article", title: "Basic splinting", where: "First aid", route: { topic: "firstaid" }, boost: 0, kw: "splint broken bone fracture immobilize", body: "" });
  ARTICLES.forEach((a) => {
    add({ kind: "article", title: a.title, where: "Reference", route: { topic: a.id }, boost: 5, kw: `${a.title} ${a.blurb} ${ARTICLE_WORDS[a.id] ?? ""}`, body: "" });
    a.sections.forEach((s, si) => {
      /* each h3 inside a section is its own hit too, so "flash floods" lands on Weather */
      let sub: string | null = null; let buf: string[] = [];
      const flush = () => {
        if (sub) add({ kind: "section", title: sub, where: a.title, route: { topic: a.id, sec: String(si) }, boost: 0, kw: sub, body: buf.join(" ") });
        buf = [];
      };
      s.blocks.forEach((b) => { if (b.t === "h") { flush(); sub = b.text; } else buf.push(blockText(b)); });
      flush();
      if (si > 0 || a.sections.length > 1) add({ kind: "section", title: s.title, where: a.title, route: { topic: a.id, sec: String(si) }, boost: 0, kw: s.title, body: s.blocks.map(blockText).join(" ") });
    });
  });
  QUICK_REF.forEach((q) => add({ kind: "quick", title: q.t, where: "Quick reference", route: { topic: "quick" }, boost: 0, kw: q.t, body: q.d }));
  return out;
}

/** Every word must appear in the title, keywords or text. Titles and triage rank first, as in SOS. */
export function searchSafety(q: string, limit = 12): SafetyHit[] {
  const query = norm(q.trim());
  if (!query) return [];
  const words = query.split(/\s+/).filter(Boolean);
  INDEX ??= buildIndex();
  const seen = new Set<string>();
  return INDEX
    .filter((e) => words.every((w) => e.title_l.includes(w) || e.kw.includes(w) || e.body.includes(w)))
    .map((e) => {
      let score = e.boost;
      if (e.title_l.includes(query)) score += 100;
      words.forEach((w) => { if (e.title_l.includes(w)) score += 10; else if (e.kw.includes(w)) score += 6; });
      return { e, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ e }) => ({ kind: e.kind, title: e.title, where: e.where, route: e.route }))
    .filter((h) => { const k = h.title + JSON.stringify(h.route); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, limit);
}

/* ---------- saved topics: a short list on this device ---------- */
export const SAFETY_SAVED_KEY = "co-field-safety-saved-v1";
/** "flow:bleeding", "topic:weather" */
export type SavedRef = string;
export const loadSaved = (): SavedRef[] => {
  const v = loadKey<unknown>(SAFETY_SAVED_KEY);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && /^(flow|topic):[a-z_]+$/.test(x)) : [];
};
export function toggleSavedRef(ref: SavedRef): SavedRef[] {
  const cur = loadSaved();
  const next = cur.includes(ref) ? cur.filter((r) => r !== ref) : [...cur, ref];
  saveKey(SAFETY_SAVED_KEY, next);
  return next;
}
export function savedLabel(ref: SavedRef): string | null {
  const [kind, id] = ref.split(":");
  if (kind === "flow") return TRIAGE[id] ? situationLabel(id) : null;
  if (id === "firstaid") return "First aid";
  if (id === "quick") return "Quick reference";
  return articleById(id)?.title ?? null;
}

/* ---------- context: which reference topics a place page points to ----------
   General reading, not a judgement about the place. Trail pages always offer
   weather, getting found and wildlife; a road note adds vehicle trouble, and
   the season adds cold or heat. */
export interface ContextLink { label: string; route: Record<string, string> }
export function contextLinks(opts: { month: number; vehicleNote?: string | null }): ContextLink[] {
  const links: ContextLink[] = [
    { label: "Lightning, storms & flash floods", route: { topic: "weather" } },
    { label: "Lost or stranded: S.T.O.P.", route: { flow: "lost" } },
    { label: "Signaling for help", route: { topic: "signal" } },
    { label: "Wildlife encounters", route: { topic: "wildlife" } },
    { label: "Finding and treating water", route: { topic: "water" } },
  ];
  const cold = [11, 12, 1, 2, 3, 4].includes(opts.month);
  const hot = [6, 7, 8].includes(opts.month);
  if (cold) links.splice(1, 0, { label: "Cold exposure / hypothermia", route: { flow: "hypothermia" } });
  if (hot) links.splice(1, 0, { label: "Overheating / heat illness", route: { flow: "heat" } });
  if (opts.vehicleNote && /4wd|4x4|high[- ]clearance|awd|dirt|gravel|rough|snow|chains/i.test(opts.vehicleNote)) {
    links.push({ label: "Vehicle emergencies", route: { topic: "vehicle" } });
  }
  return links;
}
