// F-SET-01 / F-SET-02 / NF-A11Y-03
// app/_actions/settings.ts は cookies().set と revalidatePath() の薄い殻なので、
// next/headers と next/cache を vi.mock してそれぞれの呼び出しを検証する。
// Zod の境界 (PALETTE_KEYS, "on"|"off") を踏むことで invalid-input 分岐も
// 1 ファイルで網羅する。
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookieStore: { set: vi.fn() },
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mocks.cookieStore),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { SettingsError } from "@/app/_actions/errors";
import { setCursor, setPalette } from "@/app/_actions/settings";
import {
  CURSOR_COOKIE,
  PALETTE_COOKIE,
  PALETTE_KEYS,
  SETTINGS_COOKIE_MAX_AGE,
} from "@/lib/palette";

beforeEach(() => {
  mocks.cookieStore.set.mockClear();
  mocks.revalidatePath.mockClear();
});

describe("setPalette (F-SET-01)", () => {
  it.each(PALETTE_KEYS.map((key) => [key]))(
    "writes %s to the palette cookie and revalidates the layout",
    async (key) => {
      const fd = new FormData();
      fd.set("palette", key);

      await setPalette(fd);

      expect(mocks.cookieStore.set).toHaveBeenCalledTimes(1);
      expect(mocks.cookieStore.set).toHaveBeenCalledWith(
        PALETTE_COOKIE,
        key,
        expect.objectContaining({
          path: "/",
          maxAge: SETTINGS_COOKIE_MAX_AGE,
          sameSite: "lax",
          httpOnly: true,
        }),
      );
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
    },
  );

  it("throws SettingsError('invalid-input') for an unknown palette key", async () => {
    const fd = new FormData();
    fd.set("palette", "not-a-palette");

    await expect(setPalette(fd)).rejects.toMatchObject({
      name: "SettingsError",
      reason: "invalid-input",
    });
    expect(mocks.cookieStore.set).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("throws when the palette field is missing entirely", async () => {
    await expect(setPalette(new FormData())).rejects.toBeInstanceOf(
      SettingsError,
    );
    expect(mocks.cookieStore.set).not.toHaveBeenCalled();
  });
});

describe("setCursor (F-SET-02 / NF-A11Y-03)", () => {
  it("writes 'on' to the cursor cookie when enabled=on", async () => {
    const fd = new FormData();
    fd.set("enabled", "on");

    await setCursor(fd);

    expect(mocks.cookieStore.set).toHaveBeenCalledWith(
      CURSOR_COOKIE,
      "on",
      expect.objectContaining({
        path: "/",
        maxAge: SETTINGS_COOKIE_MAX_AGE,
        httpOnly: true,
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("writes 'off' when enabled=off — NF-A11Y-03 default-off path", async () => {
    const fd = new FormData();
    fd.set("enabled", "off");

    await setCursor(fd);

    expect(mocks.cookieStore.set).toHaveBeenCalledWith(
      CURSOR_COOKIE,
      "off",
      expect.objectContaining({ path: "/" }),
    );
  });

  it("throws SettingsError('invalid-input') for values outside the on/off enum", async () => {
    const fd = new FormData();
    fd.set("enabled", "yes");

    await expect(setCursor(fd)).rejects.toMatchObject({
      name: "SettingsError",
      reason: "invalid-input",
    });
    expect(mocks.cookieStore.set).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("throws when the enabled field is missing", async () => {
    await expect(setCursor(new FormData())).rejects.toBeInstanceOf(
      SettingsError,
    );
  });
});
