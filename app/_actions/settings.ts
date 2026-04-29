"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { SettingsError } from "@/app/_actions/errors";
import {
  CURSOR_COOKIE,
  PALETTE_COOKIE,
  PALETTE_KEYS,
  SETTINGS_COOKIE_MAX_AGE,
  serializeCursorEnabled,
} from "@/lib/palette";

// F-SET-01 / F-SET-02 / NF-A11Y-03
// 設定は cookie 永続。SSR で <html data-palette> / heart-cursor-on を出すので、
// 書き込んだあと revalidatePath("/", "layout") で全ルートをリフレッシュする。

const cookieOptions = {
  path: "/",
  maxAge: SETTINGS_COOKIE_MAX_AGE,
  sameSite: "lax",
  // The accent class on <html> is read by SSR; httpOnly is fine.
  httpOnly: true,
} as const;

const paletteSchema = z.object({
  palette: z.enum(PALETTE_KEYS),
});

export async function setPalette(formData: FormData): Promise<void> {
  const parsed = paletteSchema.safeParse({
    palette: formData.get("palette"),
  });
  if (!parsed.success) {
    throw new SettingsError("invalid-input");
  }
  const cookieStore = await cookies();
  cookieStore.set(PALETTE_COOKIE, parsed.data.palette, cookieOptions);
  revalidatePath("/", "layout");
}

const cursorSchema = z.object({
  enabled: z.enum(["on", "off"]),
});

export async function setCursor(formData: FormData): Promise<void> {
  const parsed = cursorSchema.safeParse({
    enabled: formData.get("enabled"),
  });
  if (!parsed.success) {
    throw new SettingsError("invalid-input");
  }
  const cookieStore = await cookies();
  cookieStore.set(
    CURSOR_COOKIE,
    serializeCursorEnabled(parsed.data.enabled === "on"),
    cookieOptions,
  );
  revalidatePath("/", "layout");
}
