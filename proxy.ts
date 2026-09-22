import { NextRequest, NextResponse } from "next/server";
import { getSession } from "./lib/auth/auth";

/**
 * Next.js 16 request-time navigation: redirect signed-in visitors away from
 * sign-in/sign-up pages before rendering. This is UX, not an access-control gate.
 * This implementation reads a session; checking only for an auth cookie would
 * be an optimistic UX hint, not proof of authentication or resource authorization.
 * Protected pages, Server Actions, and Route Handlers must still validate sessions;
 * services and repository queries must enforce authenticated ownership because
 * requests can reach those operations independently of this navigation redirect.
 */
export default async function proxy(request: NextRequest) {
  const session = await getSession();

  const isSignInPage = request.nextUrl.pathname.startsWith("/sign-in");
  const isSignUpPage = request.nextUrl.pathname.startsWith("/sign-up");

  if ((isSignInPage || isSignUpPage) && session?.user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}
