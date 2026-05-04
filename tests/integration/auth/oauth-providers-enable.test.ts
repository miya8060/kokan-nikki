// lib/auth.ts は OAuth provider の env が両方揃ったときだけ provider を
// enable する条件分岐 (`if (oauthProviders.X)`) を 3 つ持つ。env 未設定時の
// false 側だけテストすると lib/** branches coverage が threshold を割るので、
// secret-required.test.ts と同じく env を stub → resetModules で再評価する
// パターンで true 側も exercise する。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_AUTH_SECRET = "kokan-oauth-providers-test-secret-deadbeef";

describe("@/lib/auth の OAuth provider enable 分岐", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", TEST_AUTH_SECRET);
    vi.stubEnv("AUTH_GOOGLE_ID", "");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "");
    vi.stubEnv("AUTH_LINE_ID", "");
    vi.stubEnv("AUTH_LINE_SECRET", "");
    vi.stubEnv("AUTH_TWITTER_ID", "");
    vi.stubEnv("AUTH_TWITTER_SECRET", "");
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("env 全て空なら oauthProviders は全 false", async () => {
    const { oauthProviders } = await import("@/lib/auth");
    expect(oauthProviders.google).toBe(false);
    expect(oauthProviders.line).toBe(false);
    expect(oauthProviders.twitter).toBe(false);
  });

  it("AUTH_GOOGLE_ID/SECRET が揃うと google が enable される", async () => {
    vi.stubEnv("AUTH_GOOGLE_ID", "google-client-id-test");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "google-client-secret-test");
    vi.resetModules();
    const { oauthProviders } = await import("@/lib/auth");
    expect(oauthProviders.google).toBe(true);
    expect(oauthProviders.line).toBe(false);
    expect(oauthProviders.twitter).toBe(false);
  });

  it("AUTH_LINE_ID/SECRET が揃うと line が enable される", async () => {
    vi.stubEnv("AUTH_LINE_ID", "line-channel-id-test");
    vi.stubEnv("AUTH_LINE_SECRET", "line-channel-secret-test");
    vi.resetModules();
    const { oauthProviders } = await import("@/lib/auth");
    expect(oauthProviders.google).toBe(false);
    expect(oauthProviders.line).toBe(true);
    expect(oauthProviders.twitter).toBe(false);
  });

  it("AUTH_TWITTER_ID/SECRET が揃うと twitter が enable される", async () => {
    vi.stubEnv("AUTH_TWITTER_ID", "twitter-client-id-test");
    vi.stubEnv("AUTH_TWITTER_SECRET", "twitter-client-secret-test");
    vi.resetModules();
    const { oauthProviders } = await import("@/lib/auth");
    expect(oauthProviders.google).toBe(false);
    expect(oauthProviders.line).toBe(false);
    expect(oauthProviders.twitter).toBe(true);
  });

  it("全 provider env が揃うと 3 つとも enable される", async () => {
    vi.stubEnv("AUTH_GOOGLE_ID", "google-client-id-test");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "google-client-secret-test");
    vi.stubEnv("AUTH_LINE_ID", "line-channel-id-test");
    vi.stubEnv("AUTH_LINE_SECRET", "line-channel-secret-test");
    vi.stubEnv("AUTH_TWITTER_ID", "twitter-client-id-test");
    vi.stubEnv("AUTH_TWITTER_SECRET", "twitter-client-secret-test");
    vi.resetModules();
    const { oauthProviders, handlers } = await import("@/lib/auth");
    expect(oauthProviders.google).toBe(true);
    expect(oauthProviders.line).toBe(true);
    expect(oauthProviders.twitter).toBe(true);
    // sanity: NextAuth(config) も成功して handlers が export される
    expect(handlers).toBeDefined();
  });
});
