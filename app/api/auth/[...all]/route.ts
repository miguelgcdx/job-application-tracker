import { auth } from "@/lib/auth/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Route Handlers expose HTTP methods, not UI; Better Auth owns the auth protocol here.
export const { GET, POST } = toNextJsHandler(auth);
