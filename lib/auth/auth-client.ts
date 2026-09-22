// Browser-side Better Auth boundary, safe to import from Client Components.
// Unlike the server-only auth configuration, this module contains no database
// setup or server secrets; it delegates authentication to the server auth route.
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Public origin used to reach the auth server. NEXT_PUBLIC_ exposes this value
  // to the browser intentionally: a destination URL is configuration, not a secret.
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL!,
});

// These browser helpers communicate with the server auth route; they do not
// grant authorization. Protected server operations must enforce access themselves.
export const { signIn, signUp, signOut, useSession } = authClient;
