// F-AUTH-06 / issue #68 Stage 2
// link-intent cookie helper の integration カバレッジ。
//
// link-intent.test.ts (unit) は CI の coverage 集計対象外 (test:int のみで gate
// しているため) なので、real な setLinkIntentStarted / readLinkIntent /
// clearLinkIntent / setLinkIntentPending が lib/** カバレッジに乗るように
// next/headers の cookies() を mock した integration として持つ。
//
// link-account-actions.test.ts と違い、ここでは link-intent 自体は mock せず、
// 代わりに cookie store を mock する。

import "./_setup";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = vi.hoisted(() => {
  const map = new Map<string, string>();
  const reset = () => map.clear();
  const get = vi.fn((name: string) => {
    const v = map.get(name);
    return v === undefined ? undefined : { name, value: v };
  });
  const set = vi.fn(
    (name: string, value: string, opts?: Record<string, unknown>): void => {
      void opts;
      if (value === "") {
        map.delete(name);
      } else {
        map.set(name, value);
      }
    },
  );
  return { map, reset, get, set };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: cookieStore.get,
    set: cookieStore.set,
  }),
}));

import {
  __test,
  clearLinkIntent,
  generateCsrfToken,
  readLinkIntent,
  setLinkIntentPending,
  setLinkIntentStarted,
} from "@/lib/auth/link-intent";

beforeEach(() => {
  cookieStore.reset();
  cookieStore.get.mockClear();
  cookieStore.set.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("link-intent cookie I/O (integration)", () => {
  it("setLinkIntentStarted は signed cookie を書き、readLinkIntent でそのまま戻る", async () => {
    const csrf = generateCsrfToken();
    await setLinkIntentStarted({ toUserId: "user-a", csrf });

    expect(cookieStore.set).toHaveBeenCalledTimes(1);
    const [name, value, opts] = cookieStore.set.mock.calls[0];
    expect(name).toBe(__test.COOKIE_NAME);
    expect(value).toContain(".");
    expect(opts).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: __test.TTL_SECONDS,
    });

    const decoded = await readLinkIntent();
    expect(decoded).not.toBeNull();
    expect(decoded?.state).toBe("started");
    if (decoded?.state === "started") {
      expect(decoded.toUserId).toBe("user-a");
      expect(decoded.csrf).toBe(csrf);
      expect(decoded.provider).toBe("twitter");
    }
  });

  it("setLinkIntentPending は fromUserId を含む payload を書く", async () => {
    const csrf = generateCsrfToken();
    await setLinkIntentPending({
      toUserId: "user-a",
      fromUserId: "user-b",
      csrf,
    });
    const decoded = await readLinkIntent();
    expect(decoded?.state).toBe("pending-confirm");
    if (decoded?.state === "pending-confirm") {
      expect(decoded.toUserId).toBe("user-a");
      expect(decoded.fromUserId).toBe("user-b");
    }
  });

  it("clearLinkIntent で cookie が消え readLinkIntent が null", async () => {
    await setLinkIntentStarted({
      toUserId: "user-a",
      csrf: generateCsrfToken(),
    });
    expect(await readLinkIntent()).not.toBeNull();

    await clearLinkIntent();
    expect(await readLinkIntent()).toBeNull();

    // clearLinkIntent は maxAge:0 で空 value を投げる
    const last = cookieStore.set.mock.calls.at(-1);
    expect(last?.[1]).toBe("");
    expect(last?.[2]).toMatchObject({ maxAge: 0 });
  });

  it("readLinkIntent は cookie 未設定なら null", async () => {
    expect(await readLinkIntent()).toBeNull();
  });

  it("壊れた cookie 値は null として扱われる (改ざん検知)", async () => {
    cookieStore.map.set(__test.COOKIE_NAME, "garbage.value");
    expect(await readLinkIntent()).toBeNull();
  });

  it("production env では Secure 付きで cookie を書く", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await setLinkIntentStarted({
      toUserId: "user-a",
      csrf: generateCsrfToken(),
    });
    const opts = cookieStore.set.mock.calls.at(-1)?.[2];
    expect(opts).toMatchObject({ secure: true });
  });
});
