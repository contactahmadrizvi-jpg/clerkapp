"use client";

import { useEffect, useRef } from "react";
import { useUser, useAuth } from "@clerk/nextjs";

/**
 * Syncs the signed-in Clerk user to the backend DynamoDB table.
 * Call this once from a top-level client component (e.g. inside the dashboard layout).
 * It fires only once per session by tracking a ref.
 */
export function useSyncUser() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const synced = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user || synced.current) return;

    async function sync() {
      try {
        const token = await getToken();
        const primaryEmail = user!.emailAddresses[0]?.emailAddress ?? "";
        const authProvider =
          user!.externalAccounts.length > 0
            ? user!.externalAccounts[0].provider.replace("oauth_", "")
            : "email";

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/users/sync`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              email: primaryEmail,
              firstName: user!.firstName ?? undefined,
              lastName: user!.lastName ?? undefined,
              imageUrl: user!.imageUrl ?? undefined,
              authProvider,
            }),
          }
        );

        if (!res.ok) {
          console.warn("[useSyncUser] sync failed:", await res.text());
          return;
        }

        synced.current = true;
      } catch (err) {
        console.error("[useSyncUser] error:", err);
      }
    }

    sync();
  }, [isLoaded, user, getToken]);
}
