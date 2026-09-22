/**
 * Server-only Better Auth configuration and request-scoped session boundary.
 * Keep runtime consumers on the server; session identity does not authorize resource access.
 */
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { initializeUserBoard } from "../init-user-board";
import connectDB from "../db";

// Connect first so the adapter receives a ready database and the shared MongoDB client.
const mongooseInstance = await connectDB();
const client = mongooseInstance.connection.getClient();
const db = client.db();

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client,
  }),
  session: {
    // One hour of cookie caching reduces authoritative session lookups, but can
    // leave revoked sessions appearing valid until the cached session expires.
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60,
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        // Provision the default board once the new user has an identity to own it.
        after: async (user) => {
          if (user.id) {
            await initializeUserBoard(user.id);
          }
        },
      },
    },
  },
});

/**
 * Read the current session from request headers, including cookies, or return null.
 * Cookie-cached identity may be stale; protected mutations must still authorize ownership.
 */
export async function getSession() {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  return result;
}

/**
 * Sign out the session identified by request headers/cookies and redirect on success.
 * Signing out is not an access-control guard: protected mutations still require
 * their own session checks and resource ownership authorization.
 */
export async function signOut() {
  const result = await auth.api.signOut({
    headers: await headers(),
  });

  if (result.success) {
    redirect("/sign-in");
  }
}
