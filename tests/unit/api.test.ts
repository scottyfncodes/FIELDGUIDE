// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../../api/identify";
import type { VisionAnswer } from "../../src/lib/vision";

/* The one server function, run as Vercel runs it (Node, Web Request/Response). */
const answer = (): VisionAnswer => ({
  photo: { usable: true, issues: [] },
  candidates: [{ scientific_name: "Sialia currucoides", common_name: "Mountain Bluebird", likelihood: "likely", visible_features: ["sky-blue back"], check_next: "Look for a rusty breast." }],
  better_photo_tips: [], safety_note: null,
});
afterEach(() => { vi.unstubAllGlobals(); delete process.env.ANTHROPIC_API_KEY; });
/* a well-formed JPEG as far as the checks go: the FF D8 FF signature, padded base64 */
const JPEG = "/9j/" + "A".repeat(196);

describe("/api/identify (the serverless function)", () => {
  beforeEach(() => { delete process.env.ANTHROPIC_API_KEY; });
  const req = (body: unknown) => new Request("https://co-trails-atlas.vercel.app/api/identify", {
    method: "POST", headers: { "Content-Type": "application/json", Origin: "https://co-trails-atlas.vercel.app", Host: "co-trails-atlas.vercel.app" }, body: JSON.stringify(body),
  });

  it("is off without a key, and says so", async () => {
    expect(await (GET()).json()).toEqual({ configured: false, model: null });
    expect((await POST(req({}))).status).toBe(503);
  });

  it("validates input before spending anything", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    expect((await POST(req({ image: JPEG, mediaType: "image/jpeg", group: "fish", month: 6 }))).status).toBe(400);
    expect((await POST(req({ image: "A".repeat(1_700_000), mediaType: "image/jpeg", group: "bird", month: 6 }))).status).toBe(413);
    expect((await POST(req({ image: "<script>", mediaType: "image/jpeg", group: "bird", month: 6 }))).status).toBe(400);
    const foreign = new Request("https://co-trails-atlas.vercel.app/api/identify", { method: "POST", headers: { Origin: "https://evil.example", Host: "co-trails-atlas.vercel.app", "Content-Type": "application/json" }, body: "{}" });
    expect((await POST(foreign)).status).toBe(403);
    const noOrigin = new Request("https://co-trails-atlas.vercel.app/api/identify", { method: "POST", headers: { "Content-Type": "application/json", Host: "co-trails-atlas.vercel.app" }, body: "{}" });
    expect((await POST(noOrigin)).status).toBe(403); // scripts without an Origin are refused too
    const lookalike = new Request("https://co-trails-atlas.vercel.app/api/identify", { method: "POST", headers: { Origin: "https://co-trails-atlas-evil.vercel.app", Host: "co-trails-atlas.vercel.app" }, body: "{}" });
    expect((await POST(lookalike)).status).toBe(403);
    expect((await POST(req({ image: "iVBORw0KGgo" + "A".repeat(189), mediaType: "image/jpeg", group: "bird", month: 6 }))).status).toBe(400); // PNG bytes labelled JPEG
    expect((await POST(req({ image: "/9j/" + "A".repeat(195) + "!", mediaType: "image/jpeg", group: "bird", month: 6 }))).status).toBe(400); // bad base64 past the start
    const huge = new Request("https://co-trails-atlas.vercel.app/api/identify", { method: "POST", headers: { Origin: "https://co-trails-atlas.vercel.app", Host: "co-trails-atlas.vercel.app", "Content-Type": "application/json", "Content-Length": "9000000" }, body: "{}" });
    expect((await POST(huge)).status).toBe(413);
    const form = new Request("https://co-trails-atlas.vercel.app/api/identify", { method: "POST", headers: { Origin: "https://co-trails-atlas.vercel.app", Host: "co-trails-atlas.vercel.app", "Content-Type": "text/plain" }, body: "{}" });
    expect((await POST(form)).status).toBe(415);
    expect(spy).not.toHaveBeenCalled();
  });

  it("sends the photo (and no location) to the model and returns its cleaned answer", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    let sent: any = null;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body));
      return new Response(JSON.stringify({
        id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5", stop_reason: "end_turn", stop_sequence: null,
        content: [{ type: "text", text: JSON.stringify(answer()) }], usage: { input_tokens: 1, output_tokens: 1 },
      }), { headers: { "content-type": "application/json" } });
    }));
    const res = await POST(req({ image: JPEG, mediaType: "image/jpeg", group: "bird", month: 6 }));
    expect(res.status).toBe(200);
    expect((await res.json()).candidates[0].scientific_name).toBe("Sialia currucoides");
    expect(sent.messages[0].content[0]).toMatchObject({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: JPEG } });
    expect(JSON.stringify(sent)).not.toMatch(/"lat"|"lon"|latitude/);
    expect(sent.output_config.format.type).toBe("json_schema");
  });

  it("a refusal becomes a clear 422, not a fake answer", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      id: "m", type: "message", role: "assistant", model: "x", stop_reason: "refusal", stop_sequence: null, content: [], usage: { input_tokens: 1, output_tokens: 0 },
    }), { headers: { "content-type": "application/json" } })));
    expect((await POST(req({ image: JPEG, mediaType: "image/jpeg", group: "animal", month: 1 }))).status).toBe(422);
  });
});


describe("/api/identify upstream errors", () => {
  it("don't leak upstream details", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ type: "error", error: { type: "api_error", message: "internal detail" } }), { status: 500, headers: { "content-type": "application/json" } })));
    const res = await POST(new Request("https://co-trails-atlas.vercel.app/api/identify", {
      method: "POST", headers: { "Content-Type": "application/json", Origin: "https://co-trails-atlas.vercel.app", Host: "co-trails-atlas.vercel.app" },
      body: JSON.stringify({ image: JPEG, mediaType: "image/jpeg", group: "bird", month: 6 }),
    }));
    expect(res.status).toBe(502);
    expect(await res.text()).toBe(JSON.stringify({ error: "upstream" }));
  }, 30_000);
});
