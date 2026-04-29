import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEV_MAILBOX_DIR, sendMail } from "./mailer";

// 単体カバレッジ:
// - Resend HTTP 経路 (RESEND_API_KEY あり) は globalThis.fetch を spy で差し替え
// - dev mailbox 経路 (RESEND_API_KEY なし) は実 fs に書き出して読み返す。
//   integration 側は vi.mock で stub しているため、ここでしか実コードが踏めない。

const ORIGINAL_KEY = process.env.RESEND_API_KEY;

describe("sendMail (Resend HTTP path)", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = ORIGINAL_KEY;
    vi.restoreAllMocks();
  });

  it("POSTs to api.resend.com with Bearer auth and JSON body, defaulting html from text", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    await sendMail({
      to: "to@test.local",
      from: "from@test.local",
      subject: "hello <world>",
      text: "line1 & \"line2\"",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-key");
    expect(headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(init?.body as string);
    expect(body).toMatchObject({
      to: "to@test.local",
      from: "from@test.local",
      subject: "hello <world>",
      text: "line1 & \"line2\"",
    });
    // defaultHtml は text を escapeHtml して <pre> で包む
    expect(body.html).toContain("line1 &amp; &quot;line2&quot;");
    expect(body.html).toMatch(/^<pre /);
  });

  it("uses the caller-provided html instead of synthesizing one", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    await sendMail({
      to: "to@test.local",
      from: "from@test.local",
      subject: "s",
      text: "t",
      html: "<b>custom</b>",
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.html).toBe("<b>custom</b>");
  });

  it("throws when Resend returns a non-2xx status, including the status code", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("rate limited", { status: 429 }),
    );

    await expect(
      sendMail({
        to: "to@test.local",
        from: "from@test.local",
        subject: "s",
        text: "t",
      }),
    ).rejects.toThrow(/Resend error: 429/);
  });
});

describe("sendMail (dev mailbox fallback)", () => {
  // 実 fs に書くがプロセスローカルの cwd 配下の tmp/ なので衝突は無い。
  // 既存ファイルを巻き込まないよう、テスト前に対象ディレクトリを作り直す。
  const TEST_DIR = path.join(DEV_MAILBOX_DIR, "_unit-test");

  beforeEach(async () => {
    delete process.env.RESEND_API_KEY;
    await rm(DEV_MAILBOX_DIR, { recursive: true, force: true });
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    process.env.RESEND_API_KEY = ORIGINAL_KEY;
    await rm(DEV_MAILBOX_DIR, { recursive: true, force: true });
  });

  it("writes the payload to tmp/dev-mailbox/ as JSON, classified by kind", async () => {
    await sendMail({
      to: "to@test.local",
      from: "from@test.local",
      subject: "magic link",
      text: "click <here>",
      kind: "verification",
    });

    const { readdir } = await import("node:fs/promises");
    const files = (await readdir(DEV_MAILBOX_DIR)).filter((f) =>
      f.endsWith("-verification.json"),
    );
    expect(files).toHaveLength(1);

    const payload = JSON.parse(
      await readFile(path.join(DEV_MAILBOX_DIR, files[0]), "utf8"),
    );
    expect(payload).toMatchObject({
      kind: "verification",
      to: "to@test.local",
      from: "from@test.local",
      subject: "magic link",
      text: "click <here>",
    });
    expect(typeof payload.sentAt).toBe("string");
    expect(payload.html).toContain("click &lt;here&gt;");
  });

  it("defaults kind to 'other' when omitted", async () => {
    await sendMail({
      to: "to@test.local",
      from: "from@test.local",
      subject: "s",
      text: "t",
    });

    const { readdir } = await import("node:fs/promises");
    const files = (await readdir(DEV_MAILBOX_DIR)).filter((f) =>
      f.endsWith("-other.json"),
    );
    expect(files).toHaveLength(1);
  });
});
