import { describe, expect, it } from "vitest";

import {
  decodeLinkIntent,
  encodeLinkIntent,
  generateCsrfToken,
  type LinkIntentPayload,
} from "@/lib/auth/link-intent";

const SECRET = "test-secret-do-not-use-in-prod-please-32b";

function startedPayload(
  overrides: Partial<LinkIntentPayload> = {},
): LinkIntentPayload {
  return {
    v: 1,
    state: "started",
    toUserId: "user-a",
    csrf: "csrf-token-1234567890ab",
    provider: "twitter",
    exp: Math.floor(Date.now() / 1000) + 600,
    ...overrides,
  } as LinkIntentPayload;
}

describe("link-intent cookie helpers", () => {
  describe("encode/decode round-trip", () => {
    it("started payload を encode して decode すると同じ値が返る", () => {
      const p = startedPayload();
      const enc = encodeLinkIntent(p, SECRET);
      const dec = decodeLinkIntent(enc, SECRET);
      expect(dec).toEqual(p);
    });

    it("pending-confirm payload を round-trip できる", () => {
      const p: LinkIntentPayload = {
        v: 1,
        state: "pending-confirm",
        toUserId: "user-a",
        fromUserId: "user-b",
        csrf: "csrf-token-1234567890ab",
        provider: "twitter",
        exp: Math.floor(Date.now() / 1000) + 600,
      };
      expect(decodeLinkIntent(encodeLinkIntent(p, SECRET), SECRET)).toEqual(p);
    });
  });

  describe("signature verification", () => {
    it("body を改ざんすると null", () => {
      const enc = encodeLinkIntent(startedPayload(), SECRET);
      const [, sig] = enc.split(".");
      const tampered = Buffer.from(
        JSON.stringify({ ...startedPayload(), toUserId: "user-evil" }),
        "utf8",
      ).toString("base64url");
      expect(decodeLinkIntent(`${tampered}.${sig}`, SECRET)).toBeNull();
    });

    it("別 secret で sign されたものは null", () => {
      const enc = encodeLinkIntent(startedPayload(), "other-secret-32-bytes-aaaa");
      expect(decodeLinkIntent(enc, SECRET)).toBeNull();
    });

    it("signature が短い / 長すぎる場合は null", () => {
      const [body] = encodeLinkIntent(startedPayload(), SECRET).split(".");
      expect(decodeLinkIntent(`${body}.`, SECRET)).toBeNull();
      expect(decodeLinkIntent(`${body}.short`, SECRET)).toBeNull();
    });

    it("dot が無い形式は null", () => {
      expect(decodeLinkIntent("not-a-cookie", SECRET)).toBeNull();
      expect(decodeLinkIntent(".only-sig", SECRET)).toBeNull();
      expect(decodeLinkIntent("only-body.", SECRET)).toBeNull();
    });
  });

  describe("expiry", () => {
    it("exp が現在時刻以前なら null", () => {
      const past = startedPayload({ exp: 1000 });
      const enc = encodeLinkIntent(past, SECRET);
      expect(decodeLinkIntent(enc, SECRET, 2000)).toBeNull();
    });

    it("exp が未来なら ok", () => {
      const future = startedPayload({ exp: 9999999999 });
      const enc = encodeLinkIntent(future, SECRET);
      expect(decodeLinkIntent(enc, SECRET, 1)).not.toBeNull();
    });
  });

  describe("schema validation", () => {
    it("CSRF が短すぎるものは reject", () => {
      const bad = startedPayload({ csrf: "short" });
      const enc = encodeLinkIntent(bad, SECRET);
      expect(decodeLinkIntent(enc, SECRET)).toBeNull();
    });

    it("provider が twitter 以外は reject", () => {
      const bad = { ...startedPayload(), provider: "evil" } as unknown as LinkIntentPayload;
      const enc = encodeLinkIntent(bad, SECRET);
      expect(decodeLinkIntent(enc, SECRET)).toBeNull();
    });

    it("state が未知のものは reject", () => {
      const bad = {
        ...startedPayload(),
        state: "completed",
      } as unknown as LinkIntentPayload;
      const enc = encodeLinkIntent(bad, SECRET);
      expect(decodeLinkIntent(enc, SECRET)).toBeNull();
    });

    it("pending-confirm に fromUserId が無いと reject", () => {
      const bad = {
        v: 1,
        state: "pending-confirm",
        toUserId: "user-a",
        csrf: "csrf-token-1234567890ab",
        provider: "twitter",
        exp: Math.floor(Date.now() / 1000) + 600,
      } as unknown as LinkIntentPayload;
      const enc = encodeLinkIntent(bad, SECRET);
      expect(decodeLinkIntent(enc, SECRET)).toBeNull();
    });
  });

  describe("generateCsrfToken", () => {
    it("毎回ユニークな token を返し最低 16 文字以上", () => {
      const a = generateCsrfToken();
      const b = generateCsrfToken();
      expect(a).not.toBe(b);
      expect(a.length).toBeGreaterThanOrEqual(16);
    });
  });
});
