import { vi } from "vitest";
import type { User } from "@prisma/client";

// Tests using this helper must hoist `vi.mock("@/lib/auth")` at the top
// of their file. After that, call setMockSession(user) to swap in the
// session that auth() will return for that test case.

type SessionShape = {
  user: { id: string; email?: string | null; name?: string | null };
  expires: string;
} | null;

let current: SessionShape = null;

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => current),
}));

export function setMockSession(user: User): void {
  current = {
    user: { id: user.id, email: user.email, name: user.name },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function clearMockSession(): void {
  current = null;
}
