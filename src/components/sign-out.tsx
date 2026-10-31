"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOut() {
  const router = useRouter();
  return <button className="small-button" onClick={async () => { await authClient.signOut(); router.replace("/login"); router.refresh(); }}>Sign out</button>;
}
