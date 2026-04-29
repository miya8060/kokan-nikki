<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Prisma Client generation

Prisma 6 dropped the `postinstall` hook from `@prisma/client` — `pnpm install` alone no longer produces a usable client (`@prisma/engines` still downloads its binaries, but no `prisma generate` runs). This repo bridges that gap with a project-level `"postinstall": "prisma generate"` in `package.json` so every install (local, CI, Vercel) regenerates the client. If a job legitimately runs without that script (e.g. `pnpm install --ignore-scripts`), it must call `pnpm exec prisma generate` itself before `tsc`, `vitest`, or `next build`.
