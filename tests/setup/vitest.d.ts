import "vitest";

declare module "vitest" {
  interface ProvidedContext {
    DATABASE_URL: string;
  }
}
