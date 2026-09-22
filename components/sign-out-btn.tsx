"use client";

import { signOut } from "@/lib/auth/auth-client";
import { DropdownMenuItem } from "./ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const SIGN_OUT_ERROR = "Unable to sign out. Please try again.";

export default function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  async function handleSignOut() {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await signOut();
      if (result.error || !result.data) {
        setError(SIGN_OUT_ERROR);
      } else {
        // Replace authenticated history and clear cached protected UI after sign-out.
        router.replace("/sign-in");
        router.refresh();
      }
    } catch {
      setError(SIGN_OUT_ERROR);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <DropdownMenuItem
        disabled={pending}
        onSelect={(event) => {
          // Keep pending and recovery feedback in the account menu.
          event.preventDefault();
          void handleSignOut();
        }}
      >
        {pending ? "Signing out…" : "Log Out"}
      </DropdownMenuItem>
      {error && <p role="alert" className="px-2 py-1 text-sm text-destructive">{error}</p>}
    </>
  );
}
