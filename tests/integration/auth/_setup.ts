// Auth.js v5 reads AUTH_SECRET (and friends) at the moment NextAuth(config) is
// invoked — i.e. when @/lib/auth is first imported. Test files import this
// module BEFORE @/lib/auth so that handlers() locks in the test secret and
// not whatever happens to be in the developer's shell.
//
// AUTH_URL is intentionally cleared: when unset, reqWithEnvURL is a no-op so
// we can drive handlers.GET/POST with plain Request objects (no NextRequest
// dependency) and Auth.js falls back to the request URL's origin.

process.env.AUTH_SECRET = "kokan-test-auth-secret-deadbeef-deadbeef-cafe";
process.env.RESEND_API_KEY = "re_test_unused_in_integration";
process.env.EMAIL_FROM = "kokan-nikki <noreply@test.local>";
delete process.env.AUTH_URL;
delete process.env.NEXTAUTH_URL;
delete process.env.NEXTAUTH_SECRET;

export const TEST_AUTH_SECRET = process.env.AUTH_SECRET;
export const TEST_ORIGIN = "http://localhost:3000";
