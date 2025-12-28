"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const user = getStoredUser();

    if (!user) {
      // User is not logged in, redirect to login
      router.replace("/login");
    } else {
      // User is logged in
      const isAdmin = user.role === "admin" || user.userType === "admin";

      if (isAdmin) {
        // Admin users go to dashboard
        router.replace("/dashboard");
      } else if (user.qrId) {
        // Business users go to their business dashboard
        router.replace(`/dashboard/business/${user.qrId}`);
      } else {
        // Fallback: if no qrId, redirect to login
        router.replace("/login");
      }
    }
  }, [router]);

  return null;
}
