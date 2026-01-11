"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { getStoredUser, getAuthToken } from "@/lib/auth";
import {
  ChevronRight,
  CheckCircle2,
  Shield,
  AlertCircle,
  Smile,
  Frown,
  Meh,
  TrendingUp,
  FileText,
  Search as SearchIcon,
  Image,
  Target,
  Lightbulb,
  BarChart3,
  Clock,
  Star,
  Zap,
  Bell,
  Lock,
  ArrowRight
} from "lucide-react";

function AnalysisReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrId = searchParams.get("qr");
  const businessNameParam = searchParams.get("business");
  
  const [user, setUser] = useState(getStoredUser());
  const [gbpScore, setGbpScore] = useState<number | null>(null);
  const [gbpAnalysisData, setGbpAnalysisData] = useState<{
    businessName: string;
    rating: number;
    reviewCount: number;
    address: string;
    googleSearchRank: number;
    profileCompletion: number;
    missingFields: number;
    seoScore: number;
    reviewScore: number;
    reviewReplyScore: number;
    responseTime: number;
    photoCount: number;
    photoQuality: number;
    positiveReviews: number;
    neutralReviews: number;
    negativeReviews: number;
    localPackAppearances: number;
    actionItems: Array<{ priority: "high" | "medium" | "low"; title: string; description: string }>;
  } | null>(null);
  const [businessPhoneNumber, setBusinessPhoneNumber] = useState("");
  const [gbpConnected, setGbpConnected] = useState(false);
  const [businessName, setBusinessName] = useState("");

  // Load analysis data from sessionStorage
  useEffect(() => {
    const storedData = sessionStorage.getItem('gbpAnalysisData');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        setGbpScore(data.overallScore);
        setGbpAnalysisData(data.analysisData);
        setBusinessName(data.businessName || businessNameParam || "");
        setBusinessPhoneNumber(data.businessPhoneNumber || "");
      } catch (error) {
        console.error("Error parsing analysis data:", error);
        // Redirect back if data is invalid
        router.push(`/sales-dashboard/step-1${qrId ? `?qr=${qrId}` : ''}`);
      }
    } else {
      // If no data in sessionStorage, redirect back to step-1
      router.push(`/sales-dashboard/step-1${qrId ? `?qr=${qrId}` : ''}`);
    }
  }, [router, qrId, businessNameParam]);

  // Handle Google Business Profile Login
  const handleGoogleBusinessLogin = () => {
    // Generate the Tribly GBP connect URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tribly.ai";
    const gbpConnectUrl = `${baseUrl}/google-business-auth?business=${encodeURIComponent(businessName)}${qrId ? `&qr=${qrId}` : ''}`;
    
    // Redirect to Google Business Profile authentication page
    window.location.href = gbpConnectUrl;
  };

  // Handle Connect with GBP - Opens WhatsApp with prefilled URL
  const handleConnectWithGBP = () => {
    if (!businessPhoneNumber.trim()) return;
    
    // Generate the Tribly GBP connect URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tribly.ai";
    const gbpConnectUrl = `${baseUrl}/google-business-auth?business=${encodeURIComponent(businessName)}&phone=${encodeURIComponent(businessPhoneNumber)}`;
    
    // Generate Report link (assuming it's a report page with business info)
    const reportUrl = `${baseUrl}/report?business=${encodeURIComponent(businessName)}&phone=${encodeURIComponent(businessPhoneNumber)}`;
    
    // Create WhatsApp message with both links
    const message = `Hi! Please connect your Google Business Profile with Tribly.

1. Google Report Link: ${reportUrl}

2. Tribly GBP Connect URL: ${gbpConnectUrl}`;
    
    // Format phone number (remove spaces, +, -, parentheses for WhatsApp URL)
    // Keep only digits
    const cleanPhone = businessPhoneNumber.replace(/[^\d]/g, "");
    
    // Open WhatsApp with prefilled message
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
    
    // Mark as connected (in production, this would be set via callback/webhook after business owner completes auth)
    setGbpConnected(true);
  };

  // Generate mock business data for step-2 prefilling
  const generateMockBusinessData = (businessName: string) => {
    return {
      name: businessName,
      email: `contact@${businessName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'business'}.com`,
      phone: businessPhoneNumber || "+91 98765 43210",
      address: gbpAnalysisData?.address || "123 Main Street, Building Name",
      city: "Visakhapatnam",
      area: "Asilmetta",
      category: "retail" as any,
      overview: `Welcome to ${businessName}! We are committed to providing excellent service and customer satisfaction.`,
      googleBusinessReviewLink: "",
      services: ["Service 1", "Service 2", "Service 3"],
    };
  };

  // Handle Next Steps button (move to Step 2)
  const handleNextSteps = () => {
    if (!gbpAnalysisData) return;
    
    // Prefill all fields in step-2 with mock data based on business name
    const mockData = generateMockBusinessData(businessName);
    
    // Store data in sessionStorage for step-2
    sessionStorage.setItem('step2PrefillData', JSON.stringify({
      name: businessName || mockData.name,
      email: mockData.email,
      phone: mockData.phone || businessPhoneNumber || "",
      address: mockData.address,
      city: mockData.city,
      area: mockData.area,
      category: mockData.category,
      overview: mockData.overview,
      googleBusinessReviewLink: mockData.googleBusinessReviewLink,
      services: mockData.services,
    }));
    
    // Navigate to step-2
    const newUrl = `/sales-dashboard/step-2${qrId ? `?qr=${qrId}` : ''}`;
    router.push(newUrl);
  };

  // Helper function to get status for metrics
  const getStatus = (value: number, thresholds: { good: number; average: number }): "good" | "average" | "poor" => {
    if (value <= thresholds.good) return "good";
    if (value <= thresholds.average) return "average";
    return "poor";
  };

  // Helper function to get status component
  const getStatusBadge = (status: "good" | "average" | "poor") => {
    const config = {
      good: { icon: Smile, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
      average: { icon: Meh, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" },
      poor: { icon: Frown, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
    };
    const { icon: Icon, color, bg, border } = config[status];
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${bg} ${border} border shrink-0`}>
        <Icon className={`h-3.5 w-3.5 ${color} shrink-0`} />
        <span className={`text-xs font-semibold capitalize ${color} whitespace-nowrap`}>{status}</span>
      </div>
    );
  };

  if (!user || user.role !== "sales-team") {
    return null;
  }

  if (!gbpAnalysisData || gbpScore === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F7F1FF] via-[#F3EBFF] to-[#EFE5FF] flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading analysis report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F1FF] via-[#F3EBFF] to-[#EFE5FF]">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2">Google Analysis</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Google Business Profile reputation analysis</p>
        </div>

        {/* GBP Score Display with Detailed Metrics */}
        <div className="space-y-6">
          {/* Business Details and Rank Card - Figma Design */}
          <Card className="bg-white border-2 border-[#dbeafe] rounded-lg">
            <CardContent className="p-4 sm:p-6 lg:p-[26px] flex flex-col gap-4">
              {/* Header: "your Google reputation" */}
              <div className="flex items-center justify-center w-full">
                <div className="relative min-h-[60px] sm:h-[90px] w-full flex items-center justify-center py-2 sm:py-0">
                  <div className="flex items-center justify-center gap-2 sm:gap-[12px] flex-wrap sm:flex-nowrap px-2">
                    <span className="text-xl sm:text-2xl lg:text-[32px] font-medium text-black leading-[1.4]" style={{ fontFamily: 'var(--font-clash-grotesk), sans-serif', fontWeight: 500 }}>
                      your
                    </span>
                    <img 
                      src="https://www.figma.com/api/mcp/asset/f2d6d832-3229-41bf-aeae-b80457e27948" 
                      alt="Google" 
                      className="h-6 sm:h-8 lg:h-10 w-auto object-contain flex-shrink-0"
                      style={{ aspectRatio: '122/40.031' }}
                    />
                    <span className="text-xl sm:text-2xl lg:text-[32px] font-medium text-black leading-[1.4]" style={{ fontFamily: 'var(--font-clash-grotesk), sans-serif', fontWeight: 500 }}>
                      reputation
                    </span>
                  </div>
                </div>
              </div>

              {/* Business Details Section */}
              <div className="bg-white rounded-2xl">
                <div className="flex flex-col gap-2 items-center justify-center px-4 sm:px-6 py-3 sm:py-4">
                  {/* Business Name */}
                  <div className="flex flex-col items-center w-full">
                    <h3 className="text-lg sm:text-xl lg:text-[24px] font-semibold text-[#111827] leading-tight sm:leading-8 text-center break-words px-2" style={{ fontFamily: 'var(--font-clash-grotesk), sans-serif', fontWeight: 600 }}>
                      {gbpAnalysisData.businessName}
                    </h3>
                  </div>

                  {/* Rating and Reviews */}
                  <div className="flex flex-wrap items-center justify-center w-full gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                      {/* Star Rating */}
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        {[...Array(5)].map((_, i) => {
                          const starValue = i + 1;
                          const rating = gbpAnalysisData.rating;
                          let starSrc;
                          
                          if (starValue <= Math.floor(rating)) {
                            starSrc = "https://www.figma.com/api/mcp/asset/d26d23b9-e45f-464f-bf44-d80a10c7cf9d";
                          } else if (starValue === Math.ceil(rating) && rating % 1 !== 0) {
                            starSrc = "https://www.figma.com/api/mcp/asset/84bcc687-34d0-42b9-9192-88e3c6aa7670";
                          } else {
                            starSrc = "https://www.figma.com/api/mcp/asset/2c98212a-9092-4ac6-ae8e-e53c9d8f3b8f";
                          }
                          
                          return (
                            <img 
                              key={i}
                              src={starSrc}
                              alt={starValue <= rating ? "filled star" : "empty star"}
                              className="w-4 h-4 sm:w-5 sm:h-5"
                            />
                          );
                        })}
                      </div>
                      {/* Rating Number */}
                      <span className="text-base sm:text-[18px] font-semibold text-[#111827] leading-6 sm:leading-7" style={{ fontFamily: 'var(--font-clash-grotesk), sans-serif', fontWeight: 600 }}>
                        {gbpAnalysisData.rating}
                      </span>
                      {/* Review Count */}
                      <span className="text-xs sm:text-[14px] font-normal text-[#4b5563] leading-4 sm:leading-5" style={{ fontFamily: 'var(--font-clash-grotesk), sans-serif', fontWeight: 400 }}>
                        ({gbpAnalysisData.reviewCount} reviews)
                      </span>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex gap-2 items-center w-full justify-center px-2">
                    <img 
                      src="https://www.figma.com/api/mcp/asset/cbdd6f56-cf97-4051-8892-6461c13376f3" 
                      alt="Location" 
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0"
                    />
                    <span className="text-xs sm:text-[14px] font-normal text-[#4b5563] leading-4 sm:leading-5 text-center break-words" style={{ fontFamily: 'var(--font-clash-grotesk), sans-serif', fontWeight: 400 }}>
                      {gbpAnalysisData.address}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rank Section */}
              <div className="bg-[#fff2f2] rounded-lg w-full">
                <div className="flex flex-col items-center justify-center px-4 sm:px-7 py-3 sm:py-4">
                  <div className="flex flex-col gap-2 items-center justify-center w-full">
                    {/* Rank Number */}
                    <div className="text-4xl sm:text-5xl lg:text-[64px] font-medium text-[#dc2626] text-center leading-tight sm:leading-[72px]" style={{ fontFamily: 'var(--font-clash-grotesk), sans-serif', fontWeight: 500 }}>
                      {gbpAnalysisData.googleSearchRank}
                    </div>
                    {/* Rank Status */}
                    <span className="text-sm sm:text-[16px] font-medium text-[#dc2626] text-center leading-5 sm:leading-6" style={{ fontFamily: 'var(--font-clash-grotesk), sans-serif', fontWeight: 500 }}>
                      {getStatus(gbpAnalysisData.googleSearchRank, { good: 5, average: 10 }) === "good" 
                        ? "Good" 
                        : getStatus(gbpAnalysisData.googleSearchRank, { good: 5, average: 10 }) === "average"
                        ? "Average"
                        : "Poor"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Metrics Grid */}
          <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-5 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 px-1 md:px-0 scrollbar-hide">
            {/* Google Search Rank */}
            <Card className="border border-gray-200 transition-shadow min-w-[280px] md:min-w-0 flex-shrink-0 md:flex-shrink">
              <CardHeader className="pb-4 border-b border-gray-200 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50">
                    <SearchIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex flex-col">
                    <CardTitle className="text-base font-semibold text-gray-900">Google Search Rank</CardTitle>
                    <CardDescription className="text-xs text-gray-600 mt-1">
                      Average position on Google Search
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 items-center">
                    <div className="text-2xl sm:text-3xl lg:text-[32px] font-medium text-gray-900 leading-none">
                      {gbpAnalysisData.googleSearchRank}
                    </div>
                    <div className="flex items-center justify-center">
                      {getStatusBadge(
                        getStatus(gbpAnalysisData.googleSearchRank, { good: 5, average: 10 })
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Smile className="h-3.5 w-3.5 text-green-600" />
                        <span>Good: &lt; 5</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Meh className="h-3.5 w-3.5 text-yellow-600" />
                        <span>Average: 6-10</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Frown className="h-3.5 w-3.5 text-red-600" />
                        <span>Poor: &gt; 10</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Completion */}
            <Card className="border border-gray-200 transition-shadow min-w-[280px] md:min-w-0 flex-shrink-0 md:flex-shrink">
              <CardHeader className="pb-4 border-b border-gray-200 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-50">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex flex-col">
                    <CardTitle className="text-base font-semibold text-gray-900">Profile Completion</CardTitle>
                    <CardDescription className="text-xs text-gray-600 mt-1">
                      Completeness of business profile information
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 items-center">
                    <div className="text-2xl sm:text-3xl lg:text-[32px] font-medium text-gray-900 leading-none">
                      {gbpAnalysisData.profileCompletion}%
                    </div>
                    <div className="flex items-center justify-center">
                      {getStatusBadge(
                        getStatus(100 - gbpAnalysisData.profileCompletion, { good: 20, average: 40 })
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    {gbpAnalysisData.missingFields} fields missing
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* SEO Score */}
            <Card className="border border-gray-200 transition-shadow min-w-[280px] md:min-w-0 flex-shrink-0 md:flex-shrink">
              <CardHeader className="pb-4 border-b border-gray-200 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-green-50">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex flex-col">
                    <CardTitle className="text-base font-semibold text-gray-900">SEO Score</CardTitle>
                    <CardDescription className="text-xs text-gray-600 mt-1">
                      Search engine optimization effectiveness
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 items-center">
                    <div className="text-2xl sm:text-3xl lg:text-[32px] font-medium text-gray-900 leading-none">
                      {gbpAnalysisData.seoScore}%
                    </div>
                    <div className="flex items-center justify-center">
                      {getStatusBadge(
                        getStatus(100 - gbpAnalysisData.seoScore, { good: 30, average: 60 })
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    Keywords optimization needed
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Review Score */}
            <Card className="border border-gray-200 transition-shadow min-w-[280px] md:min-w-0 flex-shrink-0 md:flex-shrink">
              <CardHeader className="pb-4 border-b border-gray-200 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-yellow-50">
                    <Star className="h-5 w-5 text-yellow-600 fill-yellow-600" />
                  </div>
                  <div className="flex flex-col">
                    <CardTitle className="text-base font-semibold text-gray-900">Review Score</CardTitle>
                    <CardDescription className="text-xs text-gray-600 mt-1">
                      Average number of reviews received per week
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 items-center">
                    <div className="text-2xl sm:text-3xl lg:text-[32px] font-medium text-gray-900 leading-none">
                      {gbpAnalysisData.reviewScore}
                      <span className="text-xl sm:text-2xl text-gray-500">/week</span>
                    </div>
                    <div className="flex items-center justify-center">
                      {getStatusBadge(
                        getStatus(2 - gbpAnalysisData.reviewScore, { good: 0, average: 1 })
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    Target: 2 reviews per week
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Review Reply Score */}
            <Card className="border border-gray-200 transition-shadow min-w-[280px] md:min-w-0 flex-shrink-0 md:flex-shrink">
              <CardHeader className="pb-4 border-b border-gray-200 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50">
                    <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex flex-col">
                    <CardTitle className="text-base font-semibold text-gray-900">Review Reply Score</CardTitle>
                    <CardDescription className="text-xs text-gray-600 mt-1">
                      Percentage of reviews responded to
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 items-center">
                    <div className="text-2xl sm:text-3xl lg:text-[32px] font-medium text-gray-900 leading-none">
                      {gbpAnalysisData.reviewReplyScore}%
                    </div>
                    <div className="flex items-center justify-center">
                      {getStatusBadge(
                        getStatus(100 - gbpAnalysisData.reviewReplyScore, { good: 20, average: 50 })
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    Target: 80%+ response rate
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Response Time to Reviews */}
            <Card className="border border-gray-200 transition-shadow min-w-[280px] md:min-w-0 flex-shrink-0 md:flex-shrink">
              <CardHeader className="pb-4 border-b border-gray-200 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-50">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex flex-col">
                    <CardTitle className="text-base font-semibold text-gray-900">Response Time</CardTitle>
                    <CardDescription className="text-xs text-gray-600 mt-1">
                      Average time to respond to reviews
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 items-center">
                    <div className="text-2xl sm:text-3xl lg:text-[32px] font-medium text-gray-900 leading-none">
                      {gbpAnalysisData.responseTime < 24 
                        ? `${gbpAnalysisData.responseTime}h`
                        : `${Math.floor(gbpAnalysisData.responseTime / 24)}d`
                      }
                    </div>
                    <div className="flex items-center justify-center">
                      {getStatusBadge(
                        getStatus(gbpAnalysisData.responseTime, { good: 24, average: 72 })
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    Target: under 24 hours
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Photo Count and Quality */}
            <Card className="border border-gray-200 transition-shadow min-w-[280px] md:min-w-0 flex-shrink-0 md:flex-shrink">
              <CardHeader className="pb-4 border-b border-gray-200 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-pink-50">
                    <Image className="h-5 w-5 text-pink-600" />
                  </div>
                  <div className="flex flex-col">
                    <CardTitle className="text-base font-semibold text-gray-900">Photos</CardTitle>
                    <CardDescription className="text-xs text-gray-600 mt-1">
                      Photo count and quality score
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 items-center">
                    <div className="text-2xl sm:text-3xl lg:text-[32px] font-medium text-gray-900 leading-none">
                      {gbpAnalysisData.photoCount}
                    </div>
                    <div className="text-base text-gray-600 font-medium">
                      Quality: {gbpAnalysisData.photoQuality}%
                    </div>
                    <div className="flex items-center justify-center">
                      {getStatusBadge(
                        getStatus(15 - gbpAnalysisData.photoCount, { good: 0, average: 5 })
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    Target: 15+ high-quality photos
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Review Sentiment Breakdown */}
            <Card className="border border-gray-200 transition-shadow min-w-[280px] md:min-w-0 flex-shrink-0 md:flex-shrink">
              <CardHeader className="pb-4 border-b border-gray-200 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-teal-50">
                    <BarChart3 className="h-5 w-5 text-teal-600" />
                  </div>
                  <div className="flex flex-col">
                    <CardTitle className="text-base font-semibold text-gray-900">Review Sentiment</CardTitle>
                    <CardDescription className="text-xs text-gray-600 mt-1">
                      Breakdown of review ratings
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 items-center">
                    <div className="text-2xl sm:text-3xl lg:text-[32px] font-medium text-gray-900 leading-none">
                      {gbpAnalysisData.positiveReviews}%
                    </div>
                    <div className="flex items-center justify-center">
                      {getStatusBadge(
                        getStatus(100 - gbpAnalysisData.positiveReviews, { good: 20, average: 40 })
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                        <span>Positive: {gbpAnalysisData.positiveReviews}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                        <span>Neutral: {gbpAnalysisData.neutralReviews}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                        <span>Negative: {gbpAnalysisData.negativeReviews}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Local Pack Appearances */}
            <Card className="border border-gray-200 transition-shadow min-w-[280px] md:min-w-0 flex-shrink-0 md:flex-shrink">
              <CardHeader className="pb-4 border-b border-gray-200 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-50">
                    <Target className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div className="flex flex-col">
                    <CardTitle className="text-base font-semibold text-gray-900">Local Pack Visibility</CardTitle>
                    <CardDescription className="text-xs text-gray-600 mt-1">
                      Frequency in Google's local 3-pack
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 items-center">
                    <div className="text-2xl sm:text-3xl lg:text-[32px] font-medium text-gray-900 leading-none">
                      {gbpAnalysisData.localPackAppearances}%
                    </div>
                    <div className="flex items-center justify-center">
                      {getStatusBadge(
                        getStatus(100 - gbpAnalysisData.localPackAppearances, { good: 30, average: 60 })
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    Target: 50%+ of searches
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Items & Recommendations */}
          {gbpAnalysisData.actionItems.length > 0 && (
            <Card className="border-2 border-white bg-white">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-100">
                    <Lightbulb className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">Recommended Actions</CardTitle>
                    <CardDescription className="text-sm text-gray-600 mt-1">
                      Priority actions to improve your Google Business Profile score
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {gbpAnalysisData.actionItems.map((item, index) => (
                    <div
                      key={index}
                      className={`p-4 sm:p-5 rounded-xl transition-all ${
                        item.priority === "high"
                          ? "bg-red-50/80"
                          : item.priority === "medium"
                          ? "bg-yellow-50/80"
                          : "bg-blue-50/80"
                      }`}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div
                          className={`mt-1 flex-shrink-0 ${
                            item.priority === "high"
                              ? "text-red-600"
                              : item.priority === "medium"
                              ? "text-yellow-600"
                              : "text-blue-600"
                          }`}
                        >
                          {item.priority === "high" ? (
                            <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                          ) : (
                            <Target className="h-5 w-5 sm:h-6 sm:w-6" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm sm:text-base text-gray-900 mb-2">{item.title}</h4>
                          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Connect Google Business Profile Card */}
          {!gbpConnected && (
            <Card className="border border-blue-200/50 bg-white overflow-hidden relative">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-100/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
              
              <CardHeader className="pb-4 sm:pb-6 relative z-10">
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                  <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-white to-blue-50/50 border border-blue-100/50 flex-shrink-0">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M48.7909 22.4681H46.9886V22.3752H26.8513V31.3251H39.4964C37.6516 36.5351 32.6945 40.275 26.8513 40.275C19.4375 40.275 13.4265 34.2641 13.4265 26.8502C13.4265 19.4363 19.4375 13.4253 26.8513 13.4253C30.2736 13.4253 33.387 14.7163 35.7576 16.8252L42.0863 10.4965C38.0902 6.77217 32.7449 4.4754 26.8513 4.4754C14.4949 4.4754 4.47656 14.4937 4.47656 26.8502C4.47656 39.2067 14.4949 49.225 26.8513 49.225C39.2078 49.225 49.2261 39.2067 49.2261 26.8502C49.2261 25.35 49.0717 23.8855 48.7909 22.4681Z" fill="#FFC107"/>
                      <path d="M7.05859 16.4358L14.4098 21.827C16.3989 16.9023 21.2162 13.4253 26.8536 13.4253C30.2758 13.4253 33.3892 14.7163 35.7598 16.8251L42.0886 10.4964C38.0924 6.77211 32.7471 4.47534 26.8536 4.47534C18.2594 4.47534 10.8064 9.32731 7.05859 16.4358Z" fill="#FF3D00"/>
                      <path d="M26.8488 49.2247C32.6282 49.2247 37.8796 47.0129 41.85 43.4162L34.925 37.5562C32.6035 39.3228 29.766 40.2779 26.8488 40.2748C21.0292 40.2748 16.0877 36.5639 14.2261 31.3853L6.92969 37.0069C10.6327 44.253 18.1529 49.2247 26.8488 49.2247Z" fill="#4CAF50"/>
                      <path d="M48.7912 22.4679H46.9889V22.375H26.8516V31.3249H39.4967C38.6142 33.8045 37.0247 35.9712 34.9244 37.5574L34.9277 37.5552L41.8527 43.4151C41.3627 43.8604 49.2263 38.0373 49.2263 26.85C49.2263 25.3497 49.072 23.8853 48.7912 22.4679Z" fill="#1976D2"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 mb-2 leading-tight">
                      Get More Detailed Insights by Connecting Your Google Business Profile
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      Unlock powerful analytics, automated management, and actionable insights to grow your online presence
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="relative z-10">
                <div className="space-y-6">
                  {/* Top 5 Ranking - Critical Statistic */}
                  <div className="relative p-4 sm:p-6 bg-gradient-to-br from-orange-50/90 via-amber-50/90 to-yellow-50/90 rounded-2xl border border-orange-200/60">
                    {/* Decorative elements */}
                    <div className="absolute top-2 right-2 w-20 h-20 bg-orange-200/15 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-2 left-2 w-16 h-16 bg-amber-200/15 rounded-full blur-2xl"></div>
                    
                    <div className="relative z-10">
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
                        {/* Left: Statistic */}
                        <div className="flex-1 w-full">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                            <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 border border-orange-200/50 flex-shrink-0">
                              <Target className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 leading-tight">95% of Customers Engage with Top 5 Businesses</h3>
                              <p className="text-xs sm:text-sm text-gray-600 mt-1.5 leading-relaxed">Find your business in the top 5 search results</p>
                            </div>
                          </div>
                          
                          {/* Current Rank vs Target - Card Design */}
                          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-3 sm:gap-4 mt-4 sm:mt-5">
                            {/* Current Position Card */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 sm:p-5 border border-green-200/60 min-w-[120px] sm:min-w-[140px]">
                              <div className="text-center">
                                <div className={`text-2xl sm:text-3xl lg:text-4xl mb-1.5 ${
                                  gbpAnalysisData.googleSearchRank <= 5 
                                    ? 'text-green-700' 
                                    : 'text-red-700'
                                }`}>
                                  {gbpAnalysisData.googleSearchRank <= 5 
                                    ? `Rank #${gbpAnalysisData.googleSearchRank.toFixed(1)}`
                                    : `Rank #${gbpAnalysisData.googleSearchRank}`
                                  }
                                </div>
                                <div className="text-xs text-gray-700">Current Position</div>
                              </div>
                            </div>

                            {/* Arrow */}
                            <div className="flex items-center">
                              <svg className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rotate-90 sm:rotate-0" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6.29101 29.5791L49.6436 29.5791C46.0373 25.2591 44.5206 21.5967 44.2129 20.3057L47.3623 18.1836C48.1226 20.3808 49.4537 22.4663 51.7891 25.7061C53.5407 28.1359 55.8518 30.6046 57.4082 31.7822L57.709 32C56.1624 33.0663 53.6574 35.7022 51.7891 38.2939C49.4537 41.5337 48.1227 43.6192 47.3623 45.8164L44.2129 43.6943C44.5207 42.4033 46.0373 38.7409 49.6436 34.4209L6.29101 34.4209L6.29101 29.5791Z" fill="black"/>
                              </svg>
                            </div>

                            {/* Target Card */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 sm:p-5 border border-green-200/60 min-w-[120px] sm:min-w-[140px]">
                              <div className="text-center">
                                <div className="text-2xl sm:text-3xl lg:text-4xl text-green-700 mb-1.5">Top 5</div>
                                <div className="text-xs text-gray-700">Target</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Success Message - Only show if in top 5 */}
                          {gbpAnalysisData.googleSearchRank <= 5 && (
                            <div className="mt-5 flex items-center gap-3 text-green-700">
                              <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-green-700 flex items-center justify-center bg-transparent">
                                <CheckCircle2 className="h-3 w-3 text-green-700" />
                              </div>
                              <span className="text-sm leading-relaxed">You're in the top 5! Connect to maintain and improve your position.</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Right: Visual Impact */}
                        <div className="flex-shrink-0 w-full sm:w-auto">
                          <div className="bg-gradient-to-br from-white to-orange-50/30 rounded-xl p-4 sm:p-5 border border-orange-200/50">
                            <div className="text-center">
                              <div className="text-3xl sm:text-4xl text-orange-600 mb-1.5">95%</div>
                              <div className="text-xs text-gray-700 uppercase tracking-wide">Customer Engagement</div>
                              <div className="text-xs text-gray-600 mt-1">with Top 5 Results</div>
                            </div>
                            <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-gray-200/60">
                              <div className="flex items-center justify-between text-xs mb-1.5">
                                <span className="text-gray-600">Top 5</span>
                                <span className="text-orange-600">95%</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">Others</span>
                                <span className="text-gray-500">5%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Call to Action */}
                      <div className="mt-6 pt-5 border-t border-orange-200/50">
                        <div className="flex items-start gap-3">
                          <Lightbulb className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-700 leading-relaxed">
                            <span className="text-gray-900">Connect your Google Business Profile</span> to get detailed insights, 
                            optimization strategies, and automated tools to help you reach and stay in the top 5 search results.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Login Button Above Data Points */}
                  <div className="pt-2 pb-4">
                    <Button
                      onClick={handleGoogleBusinessLogin}
                      size="lg"
                      className="w-full bg-gradient-to-br from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 text-gray-900 border border-gray-300/60 text-sm sm:text-base py-4 sm:py-6 transition-all"
                    >
                      <div className="flex items-center justify-center gap-2 sm:gap-3">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M48.7909 22.4681H46.9886V22.3752H26.8513V31.3251H39.4964C37.6516 36.5351 32.6945 40.275 26.8513 40.275C19.4375 40.275 13.4265 34.2641 13.4265 26.8502C13.4265 19.4363 19.4375 13.4253 26.8513 13.4253C30.2736 13.4253 33.387 14.7163 35.7576 16.8252L42.0863 10.4965C38.0902 6.77217 32.7449 4.4754 26.8513 4.4754C14.4949 4.4754 4.47656 14.4937 4.47656 26.8502C4.47656 39.2067 14.4949 49.225 26.8513 49.225C39.2078 49.225 49.2261 39.2067 49.2261 26.8502C49.2261 25.35 49.0717 23.8855 48.7909 22.4681Z" fill="#FFC107"/>
                          <path d="M7.05859 16.4358L14.4098 21.827C16.3989 16.9023 21.2162 13.4253 26.8536 13.4253C30.2758 13.4253 33.3892 14.7163 35.7598 16.8251L42.0886 10.4964C38.0924 6.77211 32.7471 4.47534 26.8536 4.47534C18.2594 4.47534 10.8064 9.32731 7.05859 16.4358Z" fill="#FF3D00"/>
                          <path d="M26.8488 49.2247C32.6282 49.2247 37.8796 47.0129 41.85 43.4162L34.925 37.5562C32.6035 39.3228 29.766 40.2779 26.8488 40.2748C21.0292 40.2748 16.0877 36.5639 14.2261 31.3853L6.92969 37.0069C10.6327 44.253 18.1529 49.2247 26.8488 49.2247Z" fill="#4CAF50"/>
                          <path d="M48.7912 22.4679H46.9889V22.375H26.8516V31.3249H39.4967C38.6142 33.8045 37.0247 35.9712 34.9244 37.5574L34.9277 37.5552L41.8527 43.4151C41.3627 43.8604 49.2263 38.0373 49.2263 26.85C49.2263 25.3497 49.072 23.8853 48.7912 22.4679Z" fill="#1976D2"/>
                        </svg>
                        <span className="whitespace-nowrap">Login to Google Business Profile</span>
                        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 ml-1 flex-shrink-0" />
                      </div>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unlock Powerful Features Card */}
          {!gbpConnected && (
            <Card className="border border-blue-200/50 bg-white">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl font-semibold text-gray-900">
                  Unlock Powerful Features
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Connect your Google Business Profile to access advanced analytics, automation, and insights that help you grow your online presence
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Value Propositions with Data Points */}
                <div className="flex md:grid md:grid-cols-2 gap-3 sm:gap-4 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 px-1 md:px-0 scrollbar-hide mb-6">
                  {/* Real-time Analytics */}
                  <div className="flex items-start gap-2 sm:gap-3 p-4 sm:p-5 bg-gradient-to-br from-white to-blue-50/40 rounded-xl border border-blue-100/60 min-w-[280px] md:min-w-0 flex-shrink-0 md:flex-shrink">
                    <div className="p-2 sm:p-2.5 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/40 flex-shrink-0">
                      <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm sm:text-base text-gray-900 font-semibold mb-1.5 leading-tight">Real-time Analytics Dashboard</h4>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        Track review trends, sentiment analysis, and competitor performance with live data updates
                      </p>
                      <div className="mt-2 sm:mt-3 flex items-center gap-2 text-xs text-blue-600">
                        <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                        <span>See 30%+ improvement in insights accuracy</span>
                      </div>
                    </div>
                  </div>

                  {/* AI-Powered Responses */}
                  <div className="flex items-start gap-2 sm:gap-3 p-4 sm:p-5 bg-gradient-to-br from-white to-indigo-50/40 rounded-xl border border-indigo-100/60 min-w-[280px] md:min-w-0 flex-shrink-0 md:flex-shrink">
                    <div className="p-2 sm:p-2.5 rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200/40 flex-shrink-0">
                      <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm sm:text-base text-gray-900 font-semibold mb-1.5 leading-tight">AI-Powered Review Responses</h4>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        Get instant, personalized response suggestions that save time and improve customer satisfaction
                      </p>
                      <div className="mt-2 sm:mt-3 flex items-center gap-2 text-xs text-indigo-600">
                        <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                        <span>Respond 5x faster to customer reviews</span>
                      </div>
                    </div>
                  </div>

                  {/* Automated Notifications */}
                  <div className="flex items-start gap-2 sm:gap-3 p-4 sm:p-5 bg-gradient-to-br from-white to-purple-50/40 rounded-xl border border-purple-100/60 min-w-[280px] md:min-w-0 flex-shrink-0 md:flex-shrink">
                    <div className="p-2 sm:p-2.5 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200/40 flex-shrink-0">
                      <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm sm:text-base text-gray-900 font-semibold mb-1.5 leading-tight">Instant Review Notifications</h4>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        Get notified immediately when new reviews are posted, so you can respond quickly and professionally
                      </p>
                      <div className="mt-2 sm:mt-3 flex items-center gap-2 text-xs text-purple-600">
                        <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                        <span>Never miss a customer review again</span>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Insights */}
                  <div className="flex items-start gap-2 sm:gap-3 p-4 sm:p-5 bg-gradient-to-br from-white to-green-50/40 rounded-xl border border-green-100/60 min-w-[280px] md:min-w-0 flex-shrink-0 md:flex-shrink">
                    <div className="p-2 sm:p-2.5 rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200/40 flex-shrink-0">
                      <Target className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm sm:text-base text-gray-900 font-semibold mb-1.5 leading-tight">Advanced Performance Insights</h4>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        Access detailed metrics on search visibility, local pack appearances, and customer engagement patterns
                      </p>
                      <div className="mt-2 sm:mt-3 flex items-center gap-2 text-xs text-green-600">
                        <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                        <span>Identify growth opportunities instantly</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trust & Security */}
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-gradient-to-br from-white to-gray-50/50 rounded-xl border border-gray-200/60 mb-6">
                  <div className="p-2 sm:p-2.5 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-200/40 flex-shrink-0">
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                      <span className="font-semibold text-gray-900">Secure & Private:</span> Your data is encrypted and we only access information needed to manage your profile. 
                      <span className="text-gray-600"> Read-only access for analytics.</span>
                    </p>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-2">
                  <Button
                    onClick={handleGoogleBusinessLogin}
                    size="lg"
                    className="w-full bg-gradient-to-br from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 text-gray-900 border border-gray-300/60 text-sm sm:text-base py-4 sm:py-6 transition-all"
                  >
                    <div className="flex items-center justify-center gap-2 sm:gap-3">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M48.7909 22.4681H46.9886V22.3752H26.8513V31.3251H39.4964C37.6516 36.5351 32.6945 40.275 26.8513 40.275C19.4375 40.275 13.4265 34.2641 13.4265 26.8502C13.4265 19.4363 19.4375 13.4253 26.8513 13.4253C30.2736 13.4253 33.387 14.7163 35.7576 16.8252L42.0863 10.4965C38.0902 6.77217 32.7449 4.4754 26.8513 4.4754C14.4949 4.4754 4.47656 14.4937 4.47656 26.8502C4.47656 39.2067 14.4949 49.225 26.8513 49.225C39.2078 49.225 49.2261 39.2067 49.2261 26.8502C49.2261 25.35 49.0717 23.8855 48.7909 22.4681Z" fill="#FFC107"/>
                        <path d="M7.05859 16.4358L14.4098 21.827C16.3989 16.9023 21.2162 13.4253 26.8536 13.4253C30.2758 13.4253 33.3892 14.7163 35.7598 16.8251L42.0886 10.4964C38.0924 6.77211 32.7471 4.47534 26.8536 4.47534C18.2594 4.47534 10.8064 9.32731 7.05859 16.4358Z" fill="#FF3D00"/>
                        <path d="M26.8488 49.2247C32.6282 49.2247 37.8796 47.0129 41.85 43.4162L34.925 37.5562C32.6035 39.3228 29.766 40.2779 26.8488 40.2748C21.0292 40.2748 16.0877 36.5639 14.2261 31.3853L6.92969 37.0069C10.6327 44.253 18.1529 49.2247 26.8488 49.2247Z" fill="#4CAF50"/>
                        <path d="M48.7912 22.4679H46.9889V22.375H26.8516V31.3249H39.4967C38.6142 33.8045 37.0247 35.9712 34.9244 37.5574L34.9277 37.5552L41.8527 43.4151C41.3627 43.8604 49.2263 38.0373 49.2263 26.85C49.2263 25.3497 49.072 23.8853 48.7912 22.4679Z" fill="#1976D2"/>
                      </svg>
                      <span className="whitespace-nowrap">Login to Google Business Profile</span>
                      <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 ml-1 flex-shrink-0" />
                    </div>
                  </Button>
                  <p className="text-xs text-gray-600 text-center mt-3 leading-relaxed">
                    By connecting, you authorize Tribly to access your Google Business Profile data to provide enhanced analytics and management services
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Phone Number Input and Connect with GBP */}
          {!gbpConnected && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Connect with Google Business Profile</CardTitle>
                <CardDescription>
                  Enter the business owner's phone number to send them the GBP connection link via WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="business-phone">
                      Business Phone Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="business-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={businessPhoneNumber}
                      onChange={(e) => setBusinessPhoneNumber(e.target.value)}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Include country code (e.g., +91 for India)
                    </p>
                  </div>
                  <Button
                    onClick={handleConnectWithGBP}
                    disabled={!businessPhoneNumber.trim()}
                    className="w-full bg-gradient-to-br from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 text-gray-900 border border-gray-300/60 text-sm sm:text-base py-4 sm:py-6 transition-all"
                    size="lg"
                  >
                    <div className="flex items-center justify-center gap-2 sm:gap-3">
                      <Shield className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                      <span className="whitespace-nowrap">Share with business owner</span>
                      <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 ml-1 flex-shrink-0" />
                    </div>
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    This will open WhatsApp with a prefilled message containing the Google Business Profile connection link.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Steps Button */}
          {gbpConnected && (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base">Google Business Profile Connected</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Business owner has successfully authorized access
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleNextSteps}
                    size="lg"
                    className="gap-2 w-full sm:w-auto"
                  >
                    Next Steps
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnalysisReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#F7F1FF] via-[#F3EBFF] to-[#EFE5FF] flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <AnalysisReportContent />
    </Suspense>
  );
}

