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
    expect((await POST(req({ image: "AAAA", mediaType: "image/jpeg", group: "fish", month: 6 }))).status).toBe(400);
    expect((await POST(req({ image: "A".repeat(1_700_000), mediaType: "image/jpeg", group: "bird", month: 6 }))).status).toBe(413);
    expect((await POST(req({ image: "<script>", mediaType: "image/jpeg", group: "bird", month: 6 }))).status).toBe(400);
    const foreign = new Request("https://co-trails-atlas.vercel.app/api/identify", { method: "POST", headers: { Origin: "https://evil.example", Host: "co-trails-atlas.vercel.app" }, body: "{}" });
    expect((await POST(foreign)).status).toBe(403);
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
    const res = await POST(req({ image: "AAAA", mediaType: "image/jpeg", group: "bird", month: 6 }));
    expect(res.status).toBe(200);
    expect((await res.json()).candidates[0].scientific_name).toBe("Sialia currucoides");
    expect(sent.messages[0].content[0]).toMatchObject({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: "AAAA" } });
    expect(JSON.stringify(sent)).not.toMatch(/"lat"|"lon"|latitude/);
    expect(sent.output_config.format.type).toBe("json_schema");
  });

  it("a refusal becomes a clear 422, not a fake answer", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      id: "m", type: "message", role: "assistant", model: "x", stop_reason: "refusal", stop_sequence: null, content: [], usage: { input_tokens: 1, output_tokens: 0 },
    }), { headers: { "content-type": "application/json" } })));
    expect((await POST(req({ image: "AAAA", mediaType: "image/jpeg", group: "animal", month: 1 }))).status).toBe(422);
  });
});

