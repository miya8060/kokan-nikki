// 純粋ヘルパ (lib/cn, lib/palette, lib/mailer) は app の Server Action や
// API route には載っているものの、cov-gate が走らせる integration project
// の現行テストはどれも vi.mock("@/lib/mailer") などで実モジュールを stub
// しているか、そもそも import していない。結果として lib/** の lines/branches
// が integration 単体だと 80/75 を切るため、ここで実コードを 1 度通す。
//
// ロジックの網羅は unit project 側 (lib/cn.test.ts, lib/mailer.test.ts,
// lib/palette.test.ts) で別途行うので、本ファイルは「integration 経由で
// 全行が踏まれる」最小ケースに留める。

import { readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cn } from "@/lib/cn";
import { DEV_MAILBOX_DIR, sendMail } from "@/lib/mailer";
import {
  CURSOR_COOKIE,
  DEFAULT_PALETTE,
  PALETTE_COOKIE,
  PALETTE_KEYS,
  PALETTE_LABELS,
  SETTINGS_COOKIE_MAX_AGE,
  TWEAK_COOKIES,
  TWEAK_DEFAULTS,
  TWEAK_KEYS,
  TWEAK_LABELS,
  parseCursorEnabled,
  parsePalette,
  parseTweak,
  serializeCursorEnabled,
  serializeTweak,
} from "@/lib/palette";

describe("lib/cn", () => {
  it("filters falsy parts and joins with single spaces", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
    expect(cn()).toBe("");
  });
});

describe("lib/palette", () => {
  it("exposes the design tokens used by the settings UI", () => {
    expect(PALETTE_KEYS).toContain(DEFAULT_PALETTE);
    expect(PALETTE_COOKIE).toBe("kokan.palette");
    expect(CURSOR_COOKIE).toBe("kokan.cursor");
    expect(SETTINGS_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 365);
    for (const key of PALETTE_KEYS) {
      const label = PALETTE_LABELS[key];
      expect(label.name).toBeTruthy();
      expect(label.a).toMatch(/^#/);
      expect(label.b).toMatch(/^#/);
      expect(label.c).toMatch(/^#/);
    }
  });

  it("parses palette cookie with default fallback", () => {
    expect(parsePalette(undefined)).toBe(DEFAULT_PALETTE);
    expect(parsePalette("turquoise")).toBe(DEFAULT_PALETTE);
    expect(parsePalette("strawberry")).toBe("strawberry");
  });

  it("parses/serializes cursor cookie symmetrically (NF-A11Y-03 default OFF)", () => {
    expect(parseCursorEnabled(undefined)).toBe(false);
    expect(parseCursorEnabled("on")).toBe(true);
    expect(parseCursorEnabled("off")).toBe(false);
    expect(serializeCursorEnabled(true)).toBe("on");
    expect(serializeCursorEnabled(false)).toBe("off");
  });

  it("exposes the #92 Tweaks panel cookie keys / labels / defaults", () => {
    for (const key of TWEAK_KEYS) {
      expect(TWEAK_COOKIES[key]).toMatch(/^kokan\./);
      expect(TWEAK_LABELS[key].name).toBeTruthy();
      expect(TWEAK_LABELS[key].hint).toBeTruthy();
      expect(typeof TWEAK_DEFAULTS[key]).toBe("boolean");
    }
    expect(parseTweak("sparkle", undefined)).toBe(true);
    expect(parseTweak("pageFlip", undefined)).toBe(false);
    expect(parseTweak("tape", "off")).toBe(false);
    expect(serializeTweak(true)).toBe("on");
    expect(serializeTweak(false)).toBe("off");
  });
});

describe("lib/mailer", () => {
  const ORIGINAL_KEY = process.env.RESEND_API_KEY;

  afterEach(() => {
    process.env.RESEND_API_KEY = ORIGINAL_KEY;
    vi.restoreAllMocks();
  });

  it("Resend 経路: fetch を Bearer 付き JSON で叩く / 失敗時は throw", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 }));

    await sendMail({
      to: "to@test.local",
      from: "from@test.local",
      subject: "s",
      text: "<body>",
    });

    const init = fetchSpy.mock.calls[0][1];
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-key");
    const body = JSON.parse(init?.body as string);
    // text 由来の defaultHtml が <pre> でエスケープされること
    expect(body.html).toContain("&lt;body&gt;");

    await expect(
      sendMail({
        to: "to@test.local",
        from: "from@test.local",
        subject: "s",
        text: "t",
        html: "<b>raw</b>",
      }),
    ).rejects.toThrow(/Resend error: 429/);
    // 2 回目は caller html がそのまま使われる
    const body2 = JSON.parse(fetchSpy.mock.calls[1][1]?.body as string);
    expect(body2.html).toBe("<b>raw</b>");
  });

  it("dev mailbox 経路: tmp/dev-mailbox/ に kind 別 JSON を書き出す", async () => {
    delete process.env.RESEND_API_KEY;
    await rm(DEV_MAILBOX_DIR, { recursive: true, force: true });

    await sendMail({
      to: "to@test.local",
      from: "from@test.local",
      subject: "magic link",
      text: "click <here>",
      kind: "verification",
    });
    await sendMail({
      to: "to@test.local",
      from: "from@test.local",
      subject: "s",
      text: "t",
      // kind 省略時は "other" にフォールバック
    });

    const files = await readdir(DEV_MAILBOX_DIR);
    expect(files.some((f) => f.endsWith("-verification.json"))).toBe(true);
    expect(files.some((f) => f.endsWith("-other.json"))).toBe(true);

    const verification = files.find((f) => f.endsWith("-verification.json"))!;
    const payload = JSON.parse(
      await readFile(path.join(DEV_MAILBOX_DIR, verification), "utf8"),
    );
    expect(payload).toMatchObject({
      kind: "verification",
      to: "to@test.local",
      subject: "magic link",
    });
    // escapeHtml が < > & " ' を全て変換していること
    expect(payload.html).toContain("&lt;here&gt;");

    await rm(DEV_MAILBOX_DIR, { recursive: true, force: true });
  });
});
