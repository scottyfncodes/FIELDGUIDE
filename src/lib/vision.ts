/* ---------- PHOTO IDENTIFICATION: the contract ----------
   Photo recognition runs on the server (api/identify.ts) because it needs a
   secret API key. This file is the shared, pure part: what the browser sends,
   the JSON shape the model must return, and how the app words the answer.

   The model only looks at the picture. It isn't told where the photo was
   taken. Location comes in afterwards, client side, from iNaturalist records
   near the person, and it can only reorder candidates the model already
   rated equally. Being common nearby never makes a species "the answer". */

export type WildGroup = "bird" | "insect" | "animal";
export const WILD_GROUPS: { key: WildGroup; label: string; hint: string; iconic: string[] }[] = [
  { key: "bird", label: "Bird", hint: "Songbirds, raptors, waterfowl", iconic: ["Aves"] },
  { key: "insect", label: "Insect or spider", hint: "Butterflies, moths, beetles, bees, spiders", iconic: ["Insecta", "Arachnida"] },
  { key: "animal", label: "Mammal or other animal", hint: "Mammals, reptiles, amphibians", iconic: ["Mammalia", "Reptilia", "Amphibia"] },
];
export const groupMeta = (g: WildGroup) => WILD_GROUPS.find((x) => x.key === g)!;

export const PHOTO_ISSUES = ["blurry", "distant", "dark", "overexposed", "obscured", "partial", "multiple_subjects", "no_animal", "captive_or_artwork"] as const;
export type PhotoIssue = (typeof PHOTO_ISSUES)[number];
export const ISSUE_TEXT: Record<PhotoIssue, string> = {
  blurry: "The photo is blurry",
  distant: "The animal is small or far away in the frame",
  dark: "The photo is too dark",
  overexposed: "The photo is washed out",
  obscured: "Leaves, glass or something else is in the way",
  partial: "Only part of the animal shows",
  multiple_subjects: "More than one animal is in the frame",
  no_animal: "No animal is clearly visible",
  captive_or_artwork: "It may be a captive animal, a picture or a model",
};

export type Likelihood = "likely" | "possible" | "unlikely";

export interface VisionCandidate {
  scientific_name: string;
  common_name: string;
  likelihood: Likelihood;
  visible_features: string[];
  /** what a better photo would need to show to confirm or rule it out */
  check_next: string;
}

export interface VisionAnswer {
  photo: { usable: boolean; issues: PhotoIssue[] };
  candidates: VisionCandidate[];
  better_photo_tips: string[];
  safety_note: string | null;
}

export interface IdentifyRequest { image: string; mediaType: "image/jpeg" | "image/png" | "image/webp"; group: WildGroup; month: number }

export const MAX_IMAGE_BASE64 = 1_600_000; // about 1.2 MB of JPEG

/** JSON Schema for structured output: every object closed, every field required. */
export const VISION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["photo", "candidates", "better_photo_tips", "safety_note"],
  properties: {
    photo: {
      type: "object", additionalProperties: false, required: ["usable", "issues"],
      properties: {
        usable: { type: "boolean" },
        issues: { type: "array", items: { type: "string", enum: [...PHOTO_ISSUES] } },
      },
    },
    candidates: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["scientific_name", "common_name", "likelihood", "visible_features", "check_next"],
        properties: {
          scientific_name: { type: "string" },
          common_name: { type: "string" },
          likelihood: { type: "string", enum: ["likely", "possible", "unlikely"] },
          visible_features: { type: "array", items: { type: "string" } },
          check_next: { type: "string" },
        },
      },
    },
    better_photo_tips: { type: "array", items: { type: "string" } },
    safety_note: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
} as const;

export function visionPrompt(group: WildGroup, month: number): string {
  const what = groupMeta(group).label.toLowerCase();
  const monthName = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][month - 1] ?? "unknown month";
  return [
    `This photo was taken by someone on a hike who thinks it shows a ${what}. It was taken in ${monthName}. You are not told where.`,
    "Suggest which species it could be, judging only from what is visible in the photo.",
    "Rules:",
    "- List at most 4 candidates, most probable first. Use the accepted scientific binomial (genus and species) and the usual English name. If you can only tell the genus or family, give that scientific name and say so in check_next.",
    "- likelihood is 'likely' only when the diagnostic marks are clearly visible and the look-alikes are ruled out by what you can see. Otherwise 'possible' or 'unlikely'. Never claim certainty.",
    "- visible_features: the specific marks you can actually see in this photo (2 to 4 short phrases). Do not list marks that are not visible.",
    "- check_next: one short sentence naming what to look for or photograph to confirm it or tell it from its look-alikes.",
    "- photo.usable is false when the image can't support a species-level suggestion. List every quality issue that applies.",
    "- If no animal is visible, return no candidates and the issue 'no_animal'.",
    "- better_photo_tips: up to 3 short, concrete tips for a better identification photo of this subject. Empty if the photo is good.",
    "- safety_note: one short sentence only if the likely candidates are venomous, dangerous to approach, or protected from disturbance; otherwise null.",
    "Write plainly. Don't use em dashes.",
  ].join("\n");
}

const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

/** The server's answer is still untrusted: keep only well-formed parts. */
export function parseVision(raw: unknown): VisionAnswer | null {
  const r = raw as any;
  if (!r || typeof r !== "object" || !r.photo || !Array.isArray(r.candidates)) return null;
  const issues = (Array.isArray(r.photo.issues) ? r.photo.issues : []).filter((i: unknown): i is PhotoIssue => (PHOTO_ISSUES as readonly string[]).includes(i as string));
  const seen = new Set<string>();
  const candidates: VisionCandidate[] = r.candidates
    .filter((c: any) => c && isStr(c.scientific_name) && isStr(c.common_name) && ["likely", "possible", "unlikely"].includes(c.likelihood))
    .filter((c: any) => !seen.has(c.scientific_name.toLowerCase()) && !!seen.add(c.scientific_name.toLowerCase()))
    .slice(0, 4)
    .map((c: any) => ({
      scientific_name: clip(c.scientific_name.trim(), 80),
      common_name: clip(c.common_name.trim(), 80),
      likelihood: c.likelihood,
      visible_features: (Array.isArray(c.visible_features) ? c.visible_features : []).filter(isStr).slice(0, 4).map((s: string) => clip(s.trim(), 120)),
      check_next: isStr(c.check_next) ? clip(c.check_next.trim(), 220) : "",
    }));
  return {
    photo: { usable: r.photo.usable === true && !issues.includes("no_animal"), issues },
    candidates: issues.includes("no_animal") ? [] : candidates,
    better_photo_tips: (Array.isArray(r.better_photo_tips) ? r.better_photo_tips : []).filter(isStr).slice(0, 3).map((s: string) => clip(s.trim(), 160)),
    safety_note: isStr(r.safety_note) ? clip(r.safety_note.trim(), 240) : null,
  };
}

/* Issues bad enough that no candidate may be called more than "possible". */
const SERIOUS: PhotoIssue[] = ["blurry", "distant", "dark", "obscured", "partial", "no_animal", "captive_or_artwork"];

/** What the app actually shows for one candidate. Never "certain"; capped by photo quality. */
export function effectiveLikelihood(c: VisionCandidate, a: VisionAnswer): Likelihood {
  if (c.likelihood === "likely" && (!a.photo.usable || a.photo.issues.some((i) => SERIOUS.includes(i)))) return "possible";
  return c.likelihood;
}

export const LIKELIHOOD_TEXT: Record<Likelihood, string> = {
  likely: "Likely match",
  possible: "Possible match",
  unlikely: "Long shot",
};

/** Overall headline for the result screen. */
export function verdictLine(a: VisionAnswer): string {
  if (!a.candidates.length) return a.photo.issues.includes("no_animal") ? "No animal stood out in this photo." : "No suggestion from this photo.";
  const top = effectiveLikelihood(a.candidates[0], a);
  if (top === "likely") return "Probably this, judging from the photo. Check the marks before you settle on it.";
  if (!a.photo.usable) return "The photo can't settle it. These are guesses worth checking.";
  return "A few possibilities. The photo alone can't tell them apart.";
}

/** Location as context only: within one likelihood tier, species recorded nearby come first. Never across tiers. */
export function rankWithNearby<T extends { likelihood: Likelihood; taxonId: number | null }>(cands: T[], nearby: Set<number>): T[] {
  const tier: Record<Likelihood, number> = { likely: 0, possible: 1, unlikely: 2 };
  return cands
    .map((c, i) => ({ c, i }))
    .sort((x, y) => tier[x.c.likelihood] - tier[y.c.likelihood] ||
      Number(!(x.c.taxonId && nearby.has(x.c.taxonId))) - Number(!(y.c.taxonId && nearby.has(y.c.taxonId))) || x.i - y.i)
    .map((x) => x.c);
}

/** Server status: is photo recognition switched on for this deployment? */
export type VisionStatus = "on" | "off" | "unknown";
export async function visionStatus(fetchImpl: typeof fetch = fetch): Promise<VisionStatus> {
  let res: Response;
  try {
    res = await fetchImpl("/api/identify", { headers: { Accept: "application/json" } });
  } catch {
    return "unknown"; // offline: we can't tell
  }
  if (!res.ok) return "off";
  try {
    return (await res.json())?.configured === true ? "on" : "off";
  } catch {
    return "off"; // a host without the function answers with the app's HTML
  }
}

export type IdentifyOutcome =
  | { ok: true; answer: VisionAnswer }
  | { ok: false; reason: "off" | "offline" | "busy" | "too_big" | "refused" | "failed" };

export const IDENTIFY_FAIL_TEXT: Record<Exclude<IdentifyOutcome, { ok: true }>["reason"], string> = {
  off: "Photo recognition isn't switched on for this site yet.",
  offline: "You're offline. Photo recognition needs a connection. You can still compare with species seen nearby once you're back in signal, or save the photo now and name it later.",
  busy: "Photo recognition is busy right now. Try again in a minute.",
  too_big: "That photo is too large to send. Try another.",
  refused: "The recognizer declined this photo. You can still compare it with species recorded nearby.",
  failed: "Photo recognition didn't answer. Try again, or compare with species recorded nearby.",
};

export async function identifyPhoto(req: IdentifyRequest, fetchImpl: typeof fetch = fetch): Promise<IdentifyOutcome> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return { ok: false, reason: "offline" };
  if (req.image.length > MAX_IMAGE_BASE64) return { ok: false, reason: "too_big" };
  try {
    const res = await fetchImpl("/api/identify", {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(req),
    });
    if (res.status === 503) return { ok: false, reason: "off" };
    if (res.status === 429) return { ok: false, reason: "busy" };
    if (res.status === 413) return { ok: false, reason: "too_big" };
    if (res.status === 422) return { ok: false, reason: "refused" };
    if (!res.ok) return { ok: false, reason: "failed" };
    const answer = parseVision(await res.json());
    return answer ? { ok: true, answer } : { ok: false, reason: "failed" };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
