"use client";

import { useSyncUser } from "@/hooks/useSyncUser";

/**
 * Invisible client component that runs the user-sync hook.
 * Rendered inside the server dashboard page.
 */
export default function SyncUser() {
  useSyncUser();
  return null;
}
