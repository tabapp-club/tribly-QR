"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { getStoredUser } from "@/lib/auth";

function ReviewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const qrId = searchParams.get("qr");
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkQRConfiguration = async () => {
      if (!qrId) return;

      setIsChecking(true);

      try {
        // First, check QR configuration via API
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const response = await fetch(`${apiBaseUrl}/dashboard/v1/business_qr/scan?qr_id=${qrId}`);

        if (!response.ok) {
          console.error("Failed to fetch QR configuration");
          setIsChecking(false);
          return;
        }

        const data = await response.json();

        // If not configured, redirect to login page
        if (!data?.data?.is_configured) {
          // Always redirect to login if QR is not configured
          const redirectUrl = `/dashboard/business/${qrId}`;
          router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
          return;
        }

        // If configured, show the review page (no auth check needed)
        setIsChecking(false);
      } catch (error) {
        console.error("Error checking QR configuration:", error);
        setIsChecking(false);
      }
    };

    checkQRConfiguration();
  }, [qrId, router]);

  const handleRatingClick = (rating: "excellent" | "good" | "average" | "need-improvement") => {
    if (rating === "excellent" || rating === "good" || rating === "average") {
      const params = new URLSearchParams();
      params.set("rating", rating);
      if (code) params.set("code", code);
      if (qrId) params.set("qr", qrId);
      const feedbackUrl = `/feedback?${params.toString()}`;
      console.log("Navigating to feedback:", feedbackUrl);
      router.push(feedbackUrl);
    } else {
      const params = new URLSearchParams();
      if (code) params.set("code", code);
      if (qrId) params.set("qr", qrId);
      const manualFeedbackUrl = `/manual-feedback${params.toString() ? `?${params.toString()}` : ""}`;
      console.log("Navigating to manual feedback:", manualFeedbackUrl);
      router.push(manualFeedbackUrl);
    }
  };

  // Show loading state while checking QR configuration
  if (isChecking) {
    return (
      <main className="h-screen sm:min-h-screen bg-gradient-to-br from-[#F7F1FF] via-[#F3EBFF] to-[#EFE5FF] flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen sm:min-h-screen bg-gradient-to-br from-[#F7F1FF] via-[#F3EBFF] to-[#EFE5FF] flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="w-full max-w-md space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
            How was your experience?
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Share your feedback with us
          </p>
        </div>

        {/* Rating Buttons */}
        <div className="flex flex-col items-center space-y-6">
          <Button
            variant="secondary"
            onClick={() => handleRatingClick("excellent")}
            className="w-3/4 h-16 sm:h-20 rounded-full text-base font-medium bg-white border border-[#9747FF] text-[#9747FF] hover:bg-white/90 shadow-[0px_4px_0px_#9747FF]"
          >
            <span className="text-xl mr-2">😍</span>
            Excellent
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-2 !w-6 !h-6 flex-shrink-0">
              <path d="M15.9935 12.0016C15.0763 12.4669 13.5958 13.6091 12.4909 14.7323C11.1066 16.1396 10.3179 17.0455 9.86719 18L8 17.0782C8.18243 16.5174 9.91589 14.1017 11.2193 13.05C12.3653 12.1254 12.5653 12.0137 12.5969 12.0002C12.5636 11.9888 12.3504 11.8854 11.2193 10.95C9.94763 9.89834 8.18243 7.48264 8 6.92183L9.86719 6C10.3179 6.95446 11.1066 7.86039 12.4909 9.2677C13.5958 10.3909 15.0763 11.5331 15.9935 11.9984H16L15.9968 12L16 12.0016H15.9935Z" fill="#9747FF"/>
            </svg>
          </Button>

          <Button
            variant="secondary"
            onClick={() => handleRatingClick("good")}
            className="w-3/4 h-16 sm:h-20 rounded-full text-base font-medium bg-white border border-[#9747FF] text-[#9747FF] hover:bg-white/90 shadow-[0px_4px_0px_#9747FF]"
          >
            <span className="text-xl mr-2">👍</span>
            Good
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-2 !w-6 !h-6 flex-shrink-0">
              <path d="M15.9935 12.0016C15.0763 12.4669 13.5958 13.6091 12.4909 14.7323C11.1066 16.1396 10.3179 17.0455 9.86719 18L8 17.0782C8.18243 16.5174 9.91589 14.1017 11.2193 13.05C12.3653 12.1254 12.5653 12.0137 12.5969 12.0002C12.5636 11.9888 12.3504 11.8854 11.2193 10.95C9.94763 9.89834 8.18243 7.48264 8 6.92183L9.86719 6C10.3179 6.95446 11.1066 7.86039 12.4909 9.2677C13.5958 10.3909 15.0763 11.5331 15.9935 11.9984H16L15.9968 12L16 12.0016H15.9935Z" fill="#9747FF"/>
            </svg>
          </Button>

          <Button
            variant="secondary"
            onClick={() => handleRatingClick("average")}
            className="w-3/4 h-16 sm:h-20 rounded-full text-base font-medium bg-white border border-[#9747FF] text-[#9747FF] hover:bg-white/90 shadow-[0px_4px_0px_#9747FF]"
          >
            <span className="text-xl mr-2">😐</span>
            Average
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-2 !w-6 !h-6 flex-shrink-0">
              <path d="M15.9935 12.0016C15.0763 12.4669 13.5958 13.6091 12.4909 14.7323C11.1066 16.1396 10.3179 17.0455 9.86719 18L8 17.0782C8.18243 16.5174 9.91589 14.1017 11.2193 13.05C12.3653 12.1254 12.5653 12.0137 12.5969 12.0002C12.5636 11.9888 12.3504 11.8854 11.2193 10.95C9.94763 9.89834 8.18243 7.48264 8 6.92183L9.86719 6C10.3179 6.95446 11.1066 7.86039 12.4909 9.2677C13.5958 10.3909 15.0763 11.5331 15.9935 11.9984H16L15.9968 12L16 12.0016H15.9935Z" fill="#9747FF"/>
            </svg>
          </Button>

          <Button
            variant="secondary"
            onClick={() => handleRatingClick("need-improvement")}
            className="w-3/4 h-16 sm:h-20 rounded-full text-base font-medium bg-white border border-[#9747FF] text-[#9747FF] hover:bg-white/90 shadow-[0px_4px_0px_#9747FF]"
          >
            <span className="text-xl mr-2">😕</span>
            Need Improvement
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-2 !w-6 !h-6 flex-shrink-0">
              <path d="M15.9935 12.0016C15.0763 12.4669 13.5958 13.6091 12.4909 14.7323C11.1066 16.1396 10.3179 17.0455 9.86719 18L8 17.0782C8.18243 16.5174 9.91589 14.1017 11.2193 13.05C12.3653 12.1254 12.5653 12.0137 12.5969 12.0002C12.5636 11.9888 12.3504 11.8854 11.2193 10.95C9.94763 9.89834 8.18243 7.48264 8 6.92183L9.86719 6C10.3179 6.95446 11.1066 7.86039 12.4909 9.2677C13.5958 10.3909 15.0763 11.5331 15.9935 11.9984H16L15.9968 12L16 12.0016H15.9935Z" fill="#9747FF"/>
            </svg>
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-[#F7F1FF] via-[#F3EBFF] to-[#EFE5FF] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    }>
      <ReviewPageContent />
    </Suspense>
  );
}
