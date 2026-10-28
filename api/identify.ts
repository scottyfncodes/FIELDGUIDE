import Anthropic from "@anthropic-ai/sdk";
import { MAX_IMAGE_BASE64, VISION_SCHEMA, WILD_GROUPS, parseVision, visionPrompt } from "../src/lib/vision.js";
import type { IdentifyRequest } from "../src/lib/vision.js";

/* ---------- /api/identify (Vercel Function) ----------
   The only server code in the app. It exists because photo recognition
   needs a secret key, and secrets can't live in the browser.

   GET   -> { configured } so the app can say honestly whether photo
            recognition is on, instead of showing a button that can't work.
   POST  -> { image (base64), mediaType, group, month } -> VisionAnswer JSON.

   Off unless ANTHROPIC_API_KEY is set in the Vercel project. Nothing is
   stored: the photo goes to the model for this one request. No location is
   sent. IDENTIFY_MODEL overrides the model (default claude-opus-5-5).
   Guard rails: same-origin requests only, size cap, small output cap.
   For real abuse protection add a Vercel Firewall rate-limit rule on
   /api/identify (see docs/DISCOVERY.md). */

const MODEL = process.env.IDENTIFY_MODEL || "claude-opus-5-5";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches from Safari can omit it on POST; the CORS default still blocks other sites from reading the answer
  try {
    const o = new URL(origin).host, host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    return o === host || (o.endsWith(".vercel.app") && o.startsWith("co-trails-atlas"));
  } catch {
    return false;
  }
}

export function GET() {
  return json(200, { configured: !!process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_API_KEY ? MODEL : null });
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return json(503, { error: "not_configured" });
  if (!sameOrigin(req)) return json(403, { error: "forbidden" });

  let body: IdentifyRequest;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "bad_json" });
  }
  const { image, mediaType, group, month } = body ?? ({} as IdentifyRequest);
  if (typeof image !== "string" || !image || !/^[A-Za-z0-9+/=]+$/.test(image.slice(0, 200))) return json(400, { error: "bad_image" });
  if (image.length > MAX_IMAGE_BASE64) return json(413, { error: "too_big" });
  if (!["image/jpeg", "image/png", "image/webp"].includes(mediaType)) return json(400, { error: "bad_type" });
  if (!WILD_GROUPS.some((g) => g.key === group)) return json(400, { error: "bad_group" });
  const m = Number.isInteger(month) && month >= 1 && month <= 12 ? month : new Date().getMonth() + 1;

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: VISION_SCHEMA as unknown as Record<string, unknown> } },
      system: "You help hikers identify wildlife from their own photos for a field-guide app. You are careful and honest about uncertainty: a wrong confident answer is worse than a hedged one.",
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
          { type: "text", text: visionPrompt(group, m) },
        ],
      }],
    });
    if (response.stop_reason === "refusal") return json(422, { error: "refused" });
    if (response.stop_reason === "max_tokens") return json(502, { error: "truncated" });
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const answer = parseVision(JSON.parse(text));
    if (!answer) return json(502, { error: "bad_answer" });
    return json(200, answer);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json(429, { error: "busy" });
    if (e instanceof Anthropic.BadRequestError) return json(400, { error: "rejected" });
    if (e instanceof Anthropic.AuthenticationError) return json(503, { error: "not_configured" });
    if (e instanceof Anthropic.APIError) return json(502, { error: "upstream", status: e.status });
    return json(502, { error: "failed" });
  }
}
