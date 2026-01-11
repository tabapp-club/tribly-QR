"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { BusinessStatus, BusinessCategory, UserRole } from "@/lib/types";
import { logout, setStoredUser, getStoredUser, getAuthToken } from "@/lib/auth";
import { generateQRCodeDataUrl } from "@/lib/qr-utils";
import { searchPlaces, getPlaceDetails, mapGoogleTypesToCategory, extractAddressComponents, GooglePlacePrediction } from "@/lib/google-places";
import { categorySuggestions, serviceSuggestions, getSuggestedCategories } from "@/lib/category-suggestions";
import { getMockPredictions, getMockPlaceDetails } from "@/lib/mock-places-data";
import {
  LogOut,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Crown,
  Shield,
  Check,
  Star,
  CreditCard,
  Calendar,
  XCircle,
  Clock,
  Loader2,
  Search,
  X,
  Plus,
  MapPin,
  QrCode,
  AlertCircle,
  Smile,
  Frown,
  Meh,
  TrendingUp,
  FileText,
  Search as SearchIcon,
  Image,
  MessageSquare,
  TrendingDown,
  Target,
  Lightbulb,
  BarChart3
} from "lucide-react";

function SalesDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const qrId = searchParams.get("qr");
  const [user, setUser] = useState(getStoredUser());

  // Get current step from URL pathname
  const getStepFromPath = (): 1 | 2 => {
    if (pathname?.includes('/step-2')) return 2;
    if (pathname?.includes('/step-1')) return 1;
    return 1; // Default to step 1
  };

  // Two-step flow state - initialize from URL
  const [currentStep, setCurrentStep] = useState<1 | 2>(getStepFromPath());

  // Sync step with URL when pathname changes
  useEffect(() => {
    const stepFromUrl = getStepFromPath();
    if (stepFromUrl !== currentStep) {
      setCurrentStep(stepFromUrl);
    }
    
    // If on base /sales-dashboard path, redirect to step-1
    if (pathname === '/sales-dashboard' || pathname === '/sales-dashboard/') {
      const newUrl = `/sales-dashboard/step-1${qrId ? `?qr=${qrId}` : ''}`;
      router.replace(newUrl);
    }
  }, [pathname, router, qrId, currentStep]);
  
  const [businessName, setBusinessName] = useState("");
  const [gbpScore, setGbpScore] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [businessPhoneNumber, setBusinessPhoneNumber] = useState("");
  const [gbpConnected, setGbpConnected] = useState(false);
  const [businessDataFromStep1, setBusinessDataFromStep1] = useState<any>(null);
  
  // Detailed GBP analysis data
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
    // New metrics
    responseTime: number; // hours
    photoCount: number;
    photoQuality: number; // percentage
    positiveReviews: number; // percentage (4-5 stars)
    neutralReviews: number; // percentage (3 stars)
    negativeReviews: number; // percentage (1-2 stars)
    localPackAppearances: number; // percentage of searches
    actionItems: Array<{ priority: "high" | "medium" | "low"; title: string; description: string }>;
  } | null>(null);
  
  // Business name suggestions for Step 1
  const [businessNameSuggestions, setBusinessNameSuggestions] = useState<GooglePlacePrediction[]>([]);
  const [showBusinessNameSuggestions, setShowBusinessNameSuggestions] = useState(false);
  const [isSearchingBusinessName, setIsSearchingBusinessName] = useState(false);

  useEffect(() => {
    const currentUser = getStoredUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }

    // Redirect admin users to regular dashboard
    if (currentUser.role === "admin") {
      router.push("/dashboard");
      return;
    }

    // Ensure user has role property
    if (!currentUser.role) {
      let role: UserRole = "business"; // Default fallback

      // Check userType first
      const userType = (currentUser.userType || "").toLowerCase().trim();
      if (userType === "admin") {
        role = "admin";
      } else if (userType === "business_qr_user") {
        role = "business";
      }
      // Then check email
      else if (currentUser.email === "admin@tribly.com" || currentUser.email === "admin@tribly.ai") {
        role = "admin";
      }

      const updatedUser = {
        ...currentUser,
        role: role,
      };

      // If determined as admin, redirect immediately without saving incorrect role
      if (role === "admin") {
        setStoredUser(updatedUser);
        router.push("/dashboard");
        return;
      }

      setStoredUser(updatedUser);
      setUser(updatedUser);
    } else {
      setUser(currentUser);
    }

  }, [router]);

  const handleLogout = async () => {
    await logout();
    setStoredUser(null);
    router.push("/login");
  };


  const [newBusiness, setNewBusiness] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    area: "",
    category: "" as BusinessCategory | "",
    overview: "",
    googleBusinessReviewLink: "",
    paymentPlan: "" as "qr-basic" | "qr-plus" | "",
    status: "active" as BusinessStatus,
    paymentExpiryDate: "",
    paymentStatus: undefined as "active" | "past-due" | "cancelled" | undefined,
    services: [] as string[],
  });

  // Industry benchmarks and thresholds
  const BENCHMARKS = {
    responseTime: { excellent: 12, good: 24, average: 48, poor: 72 },
    photoCount: { excellent: 20, good: 15, average: 10, poor: 5 },
    photoQuality: { excellent: 90, good: 75, average: 60, poor: 40 },
    reviewReplyRate: { excellent: 90, good: 80, average: 60, poor: 40 },
    profileCompletion: { excellent: 95, good: 85, average: 70, poor: 50 },
    searchRank: { excellent: 3, good: 5, average: 10, poor: 15 },
    seoScore: { excellent: 85, good: 70, average: 50, poor: 30 },
    reviewVelocity: { excellent: 3, good: 2, average: 1, poor: 0 },
    positiveSentiment: { excellent: 85, good: 75, average: 65, poor: 50 },
    localPackVisibility: { excellent: 60, good: 45, average: 30, poor: 15 },
  };

  // Calculate metric score based on benchmarks
  const calculateMetricScore = (value: number, metric: keyof typeof BENCHMARKS, isLowerBetter: boolean = false): number => {
    const thresholds = BENCHMARKS[metric];
    if (isLowerBetter) {
      if (value <= thresholds.excellent) return 100;
      if (value <= thresholds.good) return 85;
      if (value <= thresholds.average) return 60;
      if (value <= thresholds.poor) return 30;
      return 10;
    } else {
      if (value >= thresholds.excellent) return 100;
      if (value >= thresholds.good) return 85;
      if (value >= thresholds.average) return 60;
      if (value >= thresholds.poor) return 30;
      return 10;
    }
  };

  // Generate intelligent recommendations based on metrics
  const generateRecommendations = (metrics: {
    responseTime: number;
    photoCount: number;
    photoQuality: number;
    reviewReplyScore: number;
    profileCompletion: number;
    googleSearchRank: number;
    seoScore: number;
    reviewScore: number;
    positiveReviews: number;
    negativeReviews: number;
    localPackAppearances: number;
    reviewCount: number;
    rating: number;
  }): Array<{ priority: "high" | "medium" | "low"; title: string; description: string; impact: number }> => {
    const recommendations: Array<{ priority: "high" | "medium" | "low"; title: string; description: string; impact: number }> = [];

    // Response Time Analysis
    if (metrics.responseTime > BENCHMARKS.responseTime.poor) {
      recommendations.push({
        priority: "high",
        title: "Urgent: Improve Review Response Time",
        description: `Your average response time is ${metrics.responseTime} hours, which is significantly above the industry standard of 24 hours. Quick responses (under 12 hours) can increase customer trust by 40% and improve your ranking. Set up automated notifications and respond within 24 hours to all reviews.`,
        impact: 35
      });
    } else if (metrics.responseTime > BENCHMARKS.responseTime.average) {
      recommendations.push({
        priority: "medium",
        title: "Optimize Review Response Time",
        description: `Your response time of ${metrics.responseTime} hours is above the recommended 24-hour target. Responding within 12-24 hours can improve your visibility and customer satisfaction. Consider using Tribly's auto-reply feature for faster responses.`,
        impact: 25
      });
    }

    // Photo Count & Quality Analysis
    if (metrics.photoCount < BENCHMARKS.photoCount.poor) {
      recommendations.push({
        priority: "high",
        title: "Critical: Add High-Quality Photos",
        description: `You have only ${metrics.photoCount} photos. Businesses with 20+ photos get 2x more engagement. Add photos of: exterior, interior, products/services, team, customer testimonials, and special features. Use high-resolution images (minimum 720x720px) with good lighting.`,
        impact: 30
      });
    } else if (metrics.photoCount < BENCHMARKS.photoCount.average) {
      recommendations.push({
        priority: "medium",
        title: "Expand Photo Gallery",
        description: `You have ${metrics.photoCount} photos. Aim for 15-20 photos to showcase your business better. Add photos of different areas, products, and customer experiences. Update photos quarterly to keep your profile fresh.`,
        impact: 20
      });
    }

    if (metrics.photoQuality < BENCHMARKS.photoQuality.poor) {
      recommendations.push({
        priority: "high",
        title: "Improve Photo Quality",
        description: `Your photo quality score is ${metrics.photoQuality}%. Low-quality photos hurt your credibility. Use professional photography, ensure good lighting, remove blurry images, and maintain consistent style. Consider hiring a professional photographer for key images.`,
        impact: 25
      });
    }

    // Review Reply Rate Analysis
    if (metrics.reviewReplyScore < BENCHMARKS.reviewReplyRate.poor) {
      recommendations.push({
        priority: "high",
        title: "Respond to All Reviews",
        description: `You're only responding to ${metrics.reviewReplyScore}% of reviews. Google rewards businesses that respond to 80%+ of reviews with better rankings. Respond to every review within 24-48 hours, thank positive reviewers, and address negative feedback professionally.`,
        impact: 30
      });
    } else if (metrics.reviewReplyScore < BENCHMARKS.reviewReplyRate.average) {
      recommendations.push({
        priority: "medium",
        title: "Increase Review Response Rate",
        description: `Your response rate is ${metrics.reviewReplyScore}%. Aim for 80%+ to maximize visibility. Set aside 15 minutes daily to respond to reviews. Use personalized responses (avoid generic templates) and address specific points mentioned.`,
        impact: 20
      });
    }

    // Profile Completion Analysis
    if (metrics.profileCompletion < BENCHMARKS.profileCompletion.poor) {
      recommendations.push({
        priority: "high",
        title: "Complete Your Business Profile",
        description: `Your profile is only ${metrics.profileCompletion}% complete. Complete profiles rank 70% higher in local searches. Fill in: business hours, website, services, attributes, opening date, and all available fields. Add a detailed business description (750+ characters) with relevant keywords.`,
        impact: 35
      });
    } else if (metrics.profileCompletion < BENCHMARKS.profileCompletion.average) {
      recommendations.push({
        priority: "medium",
        title: "Enhance Profile Completeness",
        description: `Your profile is ${metrics.profileCompletion}% complete. Complete all sections including: attributes, services, products, and business updates. Add regular posts (at least 1-2 per week) to keep your profile active and engaging.`,
        impact: 20
      });
    }

    // Search Ranking Analysis
    if (metrics.googleSearchRank > BENCHMARKS.searchRank.poor) {
      recommendations.push({
        priority: "high",
        title: "Improve Local Search Ranking",
        description: `Your average search rank is ${metrics.googleSearchRank.toFixed(1)}, which means you're missing potential customers. Businesses in the top 3 positions get 75% of clicks. Optimize by: improving review count/rating, adding relevant keywords, getting more reviews, and ensuring NAP (Name, Address, Phone) consistency across the web.`,
        impact: 40
      });
    } else if (metrics.googleSearchRank > BENCHMARKS.searchRank.average) {
      recommendations.push({
        priority: "medium",
        title: "Optimize for Top 5 Rankings",
        description: `Your current rank is ${metrics.googleSearchRank.toFixed(1)}. To reach top 5: increase review frequency, optimize business description with local keywords, add more photos, post regularly, and encourage satisfied customers to leave reviews.`,
        impact: 25
      });
    }

    // SEO Score Analysis
    if (metrics.seoScore < BENCHMARKS.seoScore.poor) {
      recommendations.push({
        priority: "high",
        title: "Enhance SEO Optimization",
        description: `Your SEO score is ${metrics.seoScore}%, indicating poor optimization. Improve by: adding location-based keywords in business description, using relevant categories, adding services/products, optimizing business name with location, and building local citations.`,
        impact: 30
      });
    } else if (metrics.seoScore < BENCHMARKS.seoScore.average) {
      recommendations.push({
        priority: "medium",
        title: "Strengthen SEO Foundation",
        description: `Your SEO score is ${metrics.seoScore}%. Enhance by: adding more relevant keywords naturally, creating detailed service descriptions, adding FAQ section, and ensuring consistent business information across all platforms.`,
        impact: 20
      });
    }

    // Review Velocity Analysis
    if (metrics.reviewScore < BENCHMARKS.reviewVelocity.poor) {
      recommendations.push({
        priority: "high",
        title: "Increase Review Frequency",
        description: `You're getting ${metrics.reviewScore} reviews per week. Aim for 2-3 reviews per week for optimal visibility. Implement a review request system: send follow-up emails/SMS after service, use QR codes, train staff to ask for reviews, and make it easy with direct links.`,
        impact: 35
      });
    } else if (metrics.reviewScore < BENCHMARKS.reviewVelocity.average) {
      recommendations.push({
        priority: "medium",
        title: "Boost Review Collection",
        description: `You're getting ${metrics.reviewScore} review(s) per week. Increase to 2+ per week by: automating review requests, offering incentives (not for reviews, but for feedback), following up with customers, and using Tribly's review collection tools.`,
        impact: 25
      });
    }

    // Negative Review Analysis
    if (metrics.negativeReviews > 15) {
      recommendations.push({
        priority: "high",
        title: "Address Negative Reviews",
        description: `You have ${metrics.negativeReviews}% negative reviews, which significantly impacts your reputation. Respond professionally to all negative reviews, address specific concerns, offer solutions, and follow up. Consider implementing a feedback system to catch issues before they become reviews.`,
        impact: 40
      });
    } else if (metrics.negativeReviews > 10) {
      recommendations.push({
        priority: "medium",
        title: "Manage Review Sentiment",
        description: `You have ${metrics.negativeReviews}% negative reviews. Focus on improving service quality, addressing common complaints, and encouraging satisfied customers to leave positive reviews to balance the sentiment.`,
        impact: 25
      });
    }

    // Positive Sentiment Analysis
    if (metrics.positiveReviews < BENCHMARKS.positiveSentiment.poor) {
      recommendations.push({
        priority: "high",
        title: "Improve Customer Satisfaction",
        description: `Only ${metrics.positiveReviews}% of reviews are positive. This indicates service quality issues. Focus on: training staff, improving customer experience, addressing pain points, and following up with customers to ensure satisfaction.`,
        impact: 35
      });
    }

    // Local Pack Visibility Analysis
    if (metrics.localPackAppearances < BENCHMARKS.localPackVisibility.poor) {
      recommendations.push({
        priority: "medium",
        title: "Increase Local Pack Appearances",
        description: `You're appearing in the local 3-pack for only ${metrics.localPackAppearances}% of relevant searches. Improve by: optimizing for local keywords, getting more reviews, ensuring accurate business information, and building local citations.`,
        impact: 20
      });
    } else if (metrics.localPackAppearances < BENCHMARKS.localPackVisibility.average) {
      recommendations.push({
        priority: "low",
        title: "Optimize Local Pack Performance",
        description: `Your local pack visibility is ${metrics.localPackAppearances}%. To improve: focus on review quantity and quality, add location-specific content, and ensure your business is verified and active.`,
        impact: 15
      });
    }

    // Rating Analysis
    if (metrics.rating < 4.0 && metrics.reviewCount > 10) {
      recommendations.push({
        priority: "high",
        title: "Improve Overall Rating",
        description: `Your rating of ${metrics.rating.toFixed(1)} stars is below the 4.5+ benchmark for top businesses. Focus on service quality improvements, address negative feedback, and encourage satisfied customers to share their positive experiences.`,
        impact: 30
      });
    }

    // Review Count Analysis
    if (metrics.reviewCount < 20) {
      recommendations.push({
        priority: "medium",
        title: "Build Review Volume",
        description: `You have ${metrics.reviewCount} reviews. Businesses with 50+ reviews rank significantly higher. Implement a systematic review collection strategy: ask every customer, make it easy with QR codes, and follow up consistently.`,
        impact: 20
      });
    }

    // Sort by priority and impact, then limit to top recommendations
    return recommendations
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.impact - a.impact;
      })
      .slice(0, 8); // Return top 8 recommendations
  };

  // Real function to calculate GBP score and detailed analysis
  const calculateGBPScore = async (businessName: string): Promise<{
    overallScore: number;
    analysisData: {
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
    };
  }> => {
    // Simulate API call delay (in production, this would call actual Google Business Profile API)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to get business details from mock data if available
    const suggestions = getMockPredictions(businessName);
    const selectedBusiness = suggestions.find(s => 
      s.structured_formatting.main_text.toLowerCase().includes(businessName.toLowerCase())
    );
    
    // Generate realistic analysis data based on business characteristics
    // In production, this would come from Google Business Profile API
    const businessDetails = selectedBusiness ? getMockPlaceDetails(selectedBusiness.place_id) : null;
    
    // Generate metrics with realistic distributions (simulating real data)
    // These would come from actual GBP API in production
    const baseRating = businessDetails?.rating || parseFloat((3.5 + Math.random() * 1.5).toFixed(1));
    const rating = Math.min(5.0, Math.max(1.0, baseRating));
    
    const reviewCount = businessDetails?.user_ratings_total || Math.floor(Math.random() * 100) + 10;
    
    // Response time: businesses with more reviews tend to respond faster
    const responseTimeBase = reviewCount > 50 ? 8 + Math.random() * 20 : 12 + Math.random() * 120;
    const responseTime = Math.floor(responseTimeBase);
    
    // Photo count: established businesses have more photos
    const photoCountBase = reviewCount > 30 ? 15 + Math.random() * 20 : 5 + Math.random() * 15;
    const photoCount = Math.floor(photoCountBase);
    
    // Photo quality correlates with business age and review count
    const photoQualityBase = reviewCount > 40 ? 70 + Math.random() * 20 : 40 + Math.random() * 40;
    const photoQuality = Math.floor(photoQualityBase);
    
    // Local pack appearances: better businesses appear more
    const localPackBase = rating > 4.0 && reviewCount > 20 ? 35 + Math.random() * 25 : 10 + Math.random() * 30;
    const localPackAppearances = Math.floor(localPackBase);
    
    // Search rank: better profiles rank higher
    const rankBase = rating > 4.2 && reviewCount > 30 ? 3 + Math.random() * 7 : 8 + Math.random() * 22;
    const googleSearchRank = parseFloat(rankBase.toFixed(1));
    
    // Profile completion: varies but better businesses tend to complete more
    const profileBase = rating > 4.0 ? 75 + Math.random() * 20 : 50 + Math.random() * 30;
    const profileCompletion = Math.floor(profileBase);
    
    // Missing fields calculation
    const totalFields = 15; // Total possible fields in GBP
    const missingFields = Math.floor((100 - profileCompletion) / 100 * totalFields);
    
    // SEO score: based on profile completeness and content quality
    const seoBase = profileCompletion > 80 ? 65 + Math.random() * 25 : 30 + Math.random() * 40;
    const seoScore = Math.floor(seoBase);
    
    // Review velocity: businesses with good ratings get more reviews
    const reviewScore = rating > 4.0 ? Math.floor(Math.random() * 2) + 1 : Math.floor(Math.random() * 2);
    
    // Review reply rate: correlates with response time
    const replyBase = responseTime < 24 ? 75 + Math.random() * 20 : responseTime < 48 ? 50 + Math.random() * 25 : 20 + Math.random() * 30;
    const reviewReplyScore = Math.floor(replyBase);
    
    // Review sentiment breakdown based on rating
    let positiveReviews, neutralReviews, negativeReviews;
    if (rating >= 4.5) {
      positiveReviews = 80 + Math.random() * 15;
      neutralReviews = 5 + Math.random() * 10;
      negativeReviews = 100 - positiveReviews - neutralReviews;
    } else if (rating >= 4.0) {
      positiveReviews = 70 + Math.random() * 15;
      neutralReviews = 10 + Math.random() * 10;
      negativeReviews = 100 - positiveReviews - neutralReviews;
    } else if (rating >= 3.5) {
      positiveReviews = 55 + Math.random() * 15;
      neutralReviews = 15 + Math.random() * 10;
      negativeReviews = 100 - positiveReviews - neutralReviews;
    } else {
      positiveReviews = 40 + Math.random() * 20;
      neutralReviews = 20 + Math.random() * 15;
      negativeReviews = 100 - positiveReviews - neutralReviews;
    }
    positiveReviews = Math.floor(positiveReviews);
    neutralReviews = Math.floor(neutralReviews);
    negativeReviews = Math.floor(negativeReviews);
    
    // Generate intelligent recommendations
    const metrics = {
      responseTime,
      photoCount,
      photoQuality,
      reviewReplyScore,
      profileCompletion,
      googleSearchRank,
      seoScore,
      reviewScore,
      positiveReviews,
      negativeReviews,
      localPackAppearances,
      reviewCount,
      rating,
    };
    
    const recommendations = generateRecommendations(metrics);
    
    // Remove impact field for final action items
    const actionItems = recommendations.map(({ impact, ...rest }) => rest);
    
    const analysisData = {
      businessName: businessName,
      rating: rating,
      reviewCount: reviewCount,
      address: selectedBusiness?.structured_formatting.secondary_text || 
               businessDetails?.formatted_address ||
               "Plot 81 block E Auto Nagar Visakhapatnam, Andhra Pradesh 530012",
      googleSearchRank: googleSearchRank,
      profileCompletion: profileCompletion,
      missingFields: missingFields,
      seoScore: seoScore,
      reviewScore: reviewScore,
      reviewReplyScore: reviewReplyScore,
      responseTime: responseTime,
      photoCount: photoCount,
      photoQuality: photoQuality,
      positiveReviews: positiveReviews,
      neutralReviews: neutralReviews,
      negativeReviews: negativeReviews,
      localPackAppearances: localPackAppearances,
      actionItems: actionItems,
    };
    
    // Calculate overall score using weighted algorithm based on industry standards
    const rankScore = calculateMetricScore(googleSearchRank, "searchRank", true);
    const profileScore = calculateMetricScore(profileCompletion, "profileCompletion");
    const seoScoreValue = calculateMetricScore(seoScore, "seoScore");
    const reviewVelocityScore = calculateMetricScore(reviewScore, "reviewVelocity");
    const replyScore = calculateMetricScore(reviewReplyScore, "reviewReplyRate");
    const responseTimeScore = calculateMetricScore(responseTime, "responseTime", true);
    const photoCountScore = calculateMetricScore(photoCount, "photoCount");
    const photoQualityScore = calculateMetricScore(photoQuality, "photoQuality");
    const sentimentScore = calculateMetricScore(positiveReviews, "positiveSentiment");
    const localPackScore = calculateMetricScore(localPackAppearances, "localPackVisibility");
    
    // Weighted scoring: more important metrics have higher weights
    const overallScore = Math.round(
      (rankScore * 0.20) +           // Search ranking is critical
      (profileScore * 0.15) +         // Profile completeness matters
      (seoScoreValue * 0.12) +        // SEO optimization
      (reviewVelocityScore * 0.10) +  // Review frequency
      (replyScore * 0.12) +           // Response rate
      (responseTimeScore * 0.10) +    // Response speed
      (photoCountScore * 0.08) +      // Photo quantity
      (photoQualityScore * 0.05) +    // Photo quality
      (sentimentScore * 0.05) +       // Positive sentiment
      (localPackScore * 0.03)         // Local pack visibility
    );
    
    return {
      overallScore: Math.min(100, Math.max(0, overallScore)),
      analysisData: analysisData,
    };
  };

  // Handle Analyse button click
  const handleAnalyse = async () => {
    if (!businessName.trim()) return;
    
    setIsAnalyzing(true);
    try {
      const result = await calculateGBPScore(businessName);
      setGbpScore(result.overallScore);
      setGbpAnalysisData(result.analysisData);
      
      // Pre-fill business name in form
      setNewBusiness(prev => ({ ...prev, name: businessName }));
      setBusinessDataFromStep1({ name: businessName });
      
      // Store analysis data in sessionStorage for the report page
      sessionStorage.setItem('gbpAnalysisData', JSON.stringify({
        overallScore: result.overallScore,
        analysisData: result.analysisData,
        businessName: businessName,
        businessPhoneNumber: businessPhoneNumber,
      }));
      
      // Navigate to analysis report page
      const reportUrl = `/sales-dashboard/analysis-report?business=${encodeURIComponent(businessName)}${qrId ? `&qr=${qrId}` : ''}`;
      router.push(reportUrl);
    } catch (error) {
      console.error("Error analyzing business:", error);
    } finally {
      setIsAnalyzing(false);
    }
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
    // Try to get data from mock places if business name matches
    const suggestions = getMockPredictions(businessName);
    if (suggestions.length > 0) {
      const businessDetails = getMockPlaceDetails(suggestions[0].place_id);
      if (businessDetails) {
        const addressComponents = extractAddressComponents(businessDetails);
        const category = mapGoogleTypesToCategory(businessDetails.types || []);
        
        // Get services based on category
        const categoryServices = serviceSuggestions[category as BusinessCategory] || [];
        const selectedServices = categoryServices.slice(0, 3); // Pick first 3 services
        
        // Generate email from business name
        const emailDomain = businessDetails.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        return {
          name: businessDetails.name,
          email: `contact@${emailDomain}.com`,
          phone: businessDetails.formatted_phone_number || businessDetails.international_phone_number || businessPhoneNumber || "",
          address: addressComponents.address,
          city: addressComponents.city,
          area: addressComponents.area,
          category: category as BusinessCategory,
          overview: `Welcome to ${businessDetails.name}! We are a ${category} business committed to providing excellent service and customer satisfaction. Visit us at ${addressComponents.address}, ${addressComponents.city}.`,
          googleBusinessReviewLink: businessDetails.website || "",
          services: selectedServices,
        };
      }
    }
    
    // Fallback mock data if no match found
    const emailDomain = businessName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'business';
    return {
      name: businessName,
      email: `contact@${emailDomain}.com`,
      phone: businessPhoneNumber || "+91 98765 43210",
      address: "123 Main Street, Building Name",
      city: "Visakhapatnam",
      area: "Asilmetta",
      category: "retail" as BusinessCategory,
      overview: `Welcome to ${businessName}! We are committed to providing excellent service and customer satisfaction.`,
      googleBusinessReviewLink: "",
      services: ["Service 1", "Service 2", "Service 3"],
    };
  };

  // Handle Next Steps button (move to Step 2)
  const handleNextSteps = () => {
    // Prefill all fields in step-2 with mock data based on business name
    const mockData = generateMockBusinessData(businessName);
    
    // Update state first, then navigate
    setNewBusiness((prev) => ({
      ...prev,
      name: businessName || mockData.name,
      email: mockData.email,
      phone: mockData.phone || businessPhoneNumber || prev.phone || "",
      address: mockData.address,
      city: mockData.city,
      area: mockData.area,
      category: mockData.category,
      overview: mockData.overview,
      googleBusinessReviewLink: mockData.googleBusinessReviewLink,
      services: mockData.services,
    }));
    
    // Update step and URL after state is set
    setCurrentStep(2);
    const newUrl = `/sales-dashboard/step-2${qrId ? `?qr=${qrId}` : ''}`;
    router.push(newUrl);
  };

  // Prefill step-2 fields when navigating to step-2 (backup effect)
  useEffect(() => {
    if (currentStep === 2 && businessName) {
      // Always prefill if we're on step 2 and have a business name
      // This ensures data is filled even if handleNextSteps didn't work
      const mockData = generateMockBusinessData(businessName);
      
      setNewBusiness((prev) => {
        // Only update if the business name doesn't match or fields are empty
        if (prev.name !== businessName || !prev.email || !prev.phone || !prev.address) {
          return {
            ...prev,
            name: businessName || mockData.name || prev.name,
            email: prev.email || mockData.email,
            phone: prev.phone || mockData.phone || businessPhoneNumber || "",
            address: prev.address || mockData.address,
            city: prev.city || mockData.city,
            area: prev.area || mockData.area,
            category: prev.category || mockData.category,
            overview: prev.overview || mockData.overview,
            googleBusinessReviewLink: prev.googleBusinessReviewLink || mockData.googleBusinessReviewLink,
            services: prev.services.length > 0 ? prev.services : mockData.services,
          };
        }
        return prev;
      });
    }
  }, [currentStep, businessName, businessPhoneNumber]);

  // Search for business name suggestions in Step 1
  useEffect(() => {
    const searchBusinessNameSuggestions = () => {
      if (businessName.length < 2) {
        setBusinessNameSuggestions([]);
        setShowBusinessNameSuggestions(false);
        return;
      }

      // Don't show suggestions if we have a GBP score (analysis already done)
      if (gbpScore !== null) {
        setShowBusinessNameSuggestions(false);
        return;
      }

      setIsSearchingBusinessName(true);
      try {
        // Use mock data for suggestions
        const suggestions = getMockPredictions(businessName);
        
        // Check if the current business name exactly matches any suggestion
        // If it does, don't show suggestions (user has already selected)
        const exactMatch = suggestions.some(
          (s) => s.structured_formatting.main_text.toLowerCase() === businessName.toLowerCase()
        );
        
        setBusinessNameSuggestions(suggestions);
        // Only show suggestions if we have results AND no exact match AND no GBP score
        setShowBusinessNameSuggestions(suggestions.length > 0 && !exactMatch && gbpScore === null);
      } catch (error) {
        console.error("Error searching business name suggestions:", error);
        setBusinessNameSuggestions([]);
        setShowBusinessNameSuggestions(false);
      } finally {
        setIsSearchingBusinessName(false);
      }
    };

    const debounceTimer = setTimeout(searchBusinessNameSuggestions, 200);
    return () => clearTimeout(debounceTimer);
  }, [businessName, gbpScore]);

  // Handle business name suggestion selection in Step 1
  const handleSelectBusinessNameSuggestion = (suggestion: GooglePlacePrediction) => {
    const selectedName = suggestion.structured_formatting.main_text;
    setBusinessName(selectedName);
    
    // Get business details from mock data to prefill phone number
    const businessDetails = getMockPlaceDetails(suggestion.place_id);
    if (businessDetails) {
      const phoneNumber = businessDetails.formatted_phone_number || businessDetails.international_phone_number || "";
      if (phoneNumber) {
        setBusinessPhoneNumber(phoneNumber);
      }
    } else {
      // If no mock data found, use a default phone number
      setBusinessPhoneNumber("+91 98765 43210");
    }
    
    // Immediately close dropdown and clear suggestions
    setShowBusinessNameSuggestions(false);
    setBusinessNameSuggestions([]);
  };

  // Business search state
  const [businessSearchQuery, setBusinessSearchQuery] = useState("");
  const [businessSearchResults, setBusinessSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);

  // Category suggestions state
  const [suggestedCategories, setSuggestedCategories] = useState<BusinessCategory[]>([]);

  // Services state
  const [serviceInput, setServiceInput] = useState("");
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.business-search-container') && !target.closest('.search-results-dropdown')) {
        setShowSearchResults(false);
      }
      if (!target.closest('.service-input-container') && !target.closest('.service-suggestions-dropdown')) {
        setShowServiceSuggestions(false);
      }
      if (!target.closest('.business-name-input-container') && !target.closest('.business-name-suggestions-dropdown')) {
        setShowBusinessNameSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "failed" | "expired">("pending");
  const [paymentQRCode, setPaymentQRCode] = useState<string | null>(null);
  const [paymentTimer, setPaymentTimer] = useState(900); // 15 minutes in seconds
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [isLoadingScanData, setIsLoadingScanData] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Fetch business data from scan API when QR ID is present
  useEffect(() => {
    const fetchScanData = async () => {
      if (!qrId) return;

      setIsLoadingScanData(true);
      setScanError(null);

      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.tribly.ai";
        const authToken = getAuthToken();

        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };

        if (authToken) {
          headers["Authorization"] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${apiBaseUrl}/dashboard/v1/business_qr/scan?qr_id=${qrId}`, {
          method: "GET",
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to fetch business data");
        }

        const apiResponse = await response.json();
        const qrData = apiResponse.data;

        // Pre-populate form with fetched data
        if (qrData) {
          const businessName = qrData.business_name || "";
          // Pre-fill business name in Step 1
          if (businessName) {
            setBusinessName(businessName);
          }
          
          setNewBusiness((prev) => ({
            ...prev,
            name: businessName || prev.name,
            email: qrData.business_contact?.email || prev.email,
            phone: qrData.business_contact?.phone || prev.phone,
            address: qrData.business_address?.address_line1 || prev.address,
            city: qrData.business_address?.city || prev.city,
            area: qrData.business_address?.area || prev.area,
            category: (qrData.business_category as BusinessCategory) || prev.category,
            overview: qrData.business_description || prev.overview,
            googleBusinessReviewLink: qrData.business_google_review_url || prev.googleBusinessReviewLink,
            // If plan exists in API response, use it
            paymentPlan: qrData.plan || prev.paymentPlan,
          }));
        }
      } catch (error: any) {
        console.error("Error fetching scan data:", error);
        setScanError(error.message || "Failed to load business data");
      } finally {
        setIsLoadingScanData(false);
      }
    };

    fetchScanData();
  }, [qrId]);

  // Payment timer countdown
  useEffect(() => {
    if (showPaymentDialog && paymentStatus === "pending" && paymentTimer > 0) {
      const interval = setInterval(() => {
        setPaymentTimer((prev) => {
          if (prev <= 1) {
            setPaymentStatus("expired");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showPaymentDialog, paymentStatus, paymentTimer]);

  // Simulate payment verification (polling)
  useEffect(() => {
    if (showPaymentDialog && paymentStatus === "pending" && paymentSessionId) {
      // Simulate payment verification - in real app, this would poll your payment gateway
      const checkPayment = async () => {
        // Simulate random payment success after 5-10 seconds
        const delay = Math.random() * 5000 + 5000;
        setTimeout(() => {
          // 90% success rate for demo
          if (Math.random() > 0.1) {
            setPaymentStatus("success");
            // Update form state with payment expiry date (1 year from now)
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            setNewBusiness((prev) => ({
              ...prev,
              paymentExpiryDate: expiryDate.toISOString(),
              paymentStatus: "active",
            }));
          } else {
            setPaymentStatus("failed");
          }
        }, delay);
      };
      checkPayment();
    }
  }, [showPaymentDialog, paymentStatus, paymentSessionId]);

  // Generate payment QR code when dialog opens
  useEffect(() => {
    if (showPaymentDialog && newBusiness.paymentPlan && !paymentQRCode) {
      const generatePaymentQR = async () => {
        try {
          const planPrice = newBusiness.paymentPlan === "qr-plus" ? "6999" : "2999";
          const planName = newBusiness.paymentPlan === "qr-plus" ? "QR-Plus" : "QR-Basic";
          const businessName = newBusiness.name || "New Business";
          const sessionId = `payment-${Date.now()}`;
          setPaymentSessionId(sessionId);

          // Generate UPI payment URL (format: upi://pay?pa=merchant@upi&pn=MerchantName&am=Amount&cu=INR&tn=TransactionNote)
          // For demo, we'll use a generic payment URL
          const paymentUrl = `upi://pay?pa=tribly@pay&pn=Tribly%20QR&am=${planPrice}&cu=INR&tn=${planName}%20Subscription%20-%20${encodeURIComponent(businessName)}`;

          const qrCode = await generateQRCodeDataUrl(paymentUrl);
          setPaymentQRCode(qrCode);
          setPaymentStatus("pending");
          setPaymentTimer(900); // Reset to 15 minutes
        } catch (error) {
          console.error("Error generating payment QR code:", error);
          setPaymentStatus("failed");
        }
      };
      generatePaymentQR();
    }
  }, [showPaymentDialog, newBusiness.paymentPlan, newBusiness.name, paymentQRCode]);

  // Reset payment state when dialog closes
  useEffect(() => {
    if (!showPaymentDialog) {
      // Reset after a delay to allow success state to be visible
      setTimeout(() => {
        setPaymentQRCode(null);
        setPaymentStatus("pending");
        setPaymentTimer(900);
        setPaymentSessionId(null);
      }, paymentStatus === "success" ? 2000 : 0);
    }
  }, [showPaymentDialog, paymentStatus]);

  const handleCompletePayment = () => {
    if (!newBusiness.paymentPlan) return;
    setShowPaymentDialog(true);
  };


  // Business search handler
  useEffect(() => {
    const searchBusinesses = async () => {
      if (businessSearchQuery.length < 2) {
        setBusinessSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setIsSearching(true);
      try {
        // Try to use mock data first for faster suggestions
        const mockResults = getMockPredictions(businessSearchQuery);
        
        // If we have mock results, use them immediately
        if (mockResults.length > 0) {
          setBusinessSearchResults(mockResults);
          setShowSearchResults(mockResults.length > 0);
          setIsSearching(false);
        } else {
          // Fallback to API search if no mock results
      try {
        const results = await searchPlaces(businessSearchQuery);
        setBusinessSearchResults(results);
        setShowSearchResults(results.length > 0);
          } catch (apiError) {
            console.error("Error searching businesses via API:", apiError);
            setBusinessSearchResults([]);
            setShowSearchResults(false);
          }
        }
      } catch (error) {
        console.error("Error searching businesses:", error);
        setBusinessSearchResults([]);
        setShowSearchResults(false);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchBusinesses, 200);
    return () => clearTimeout(debounceTimer);
  }, [businessSearchQuery]);

  // Handle business selection
  const handleSelectBusiness = async (placeId: string, description: string) => {
    setIsSearching(true);
    try {
      // Try mock data first
      let details = getMockPlaceDetails(placeId);
      
      // If not found in mock data, try API
      if (!details) {
        details = await getPlaceDetails(placeId);
      }
      
      if (details) {
        const addressComponents = extractAddressComponents(details);
        const category = mapGoogleTypesToCategory(details.types || []);
        const suggestedCats = getSuggestedCategories(description);

        setSelectedBusiness(details);
        setNewBusiness((prev) => ({
          ...prev,
          name: details.name,
          phone: details.formatted_phone_number || details.international_phone_number || "",
          address: addressComponents.address,
          city: addressComponents.city,
          area: addressComponents.area,
          category: category as BusinessCategory,
          googleBusinessReviewLink: details.website || "",
        }));
        setSuggestedCategories(suggestedCats);
        setBusinessSearchQuery(details.name);
        setShowSearchResults(false);
      }
    } catch (error) {
      console.error("Error getting business details:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Get service suggestions based on category
  const getServiceSuggestions = useMemo(() => {
    if (!newBusiness.category) return [];
    return serviceSuggestions[newBusiness.category] || [];
  }, [newBusiness.category]);

  // Add service
  const handleAddService = (service: string) => {
    if (service.trim() && !newBusiness.services.includes(service.trim())) {
      setNewBusiness((prev) => ({
        ...prev,
        services: [...prev.services, service.trim()],
      }));
      setServiceInput("");
      setShowServiceSuggestions(false);
    }
  };

  // Remove service
  const handleRemoveService = (service: string) => {
    setNewBusiness((prev) => ({
      ...prev,
      services: prev.services.filter((s) => s !== service),
    }));
  };

  const handleOnboardBusiness = async () => {
    if (!user || !newBusiness.paymentPlan) return;

    setIsOnboarding(true);
    setOnboardError(null);

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.tribly.ai";
      const authToken = getAuthToken();

      // Prepare payload similar to business dashboard configure_qr API
      const payload: any = {
        name: newBusiness.name.trim(),
        description: newBusiness.overview?.trim() || null,
        email: newBusiness.email.trim() || null,
        phone: newBusiness.phone?.trim() || null,
        category: newBusiness.category || null,
        google_review_url: newBusiness.googleBusinessReviewLink?.trim() || null,
        plan: newBusiness.paymentPlan, // Send plan as "qr-plus" or "qr-basic"
      };

      // Include services if provided
      if (newBusiness.services && newBusiness.services.length > 0) {
        payload.services = newBusiness.services;
      }

      // Include QR ID if available from URL
      if (qrId) {
        payload.qr_id = qrId;
      }

      // Include address if provided
      if (newBusiness.address) {
        payload.address = {
          address_line1: newBusiness.address.trim(),
          address_line2: null,
          city: newBusiness.city?.trim() || "",
          area: newBusiness.area?.trim() || "",
        };
      }

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${apiBaseUrl}/dashboard/v1/business_qr/configure_qr`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to onboard business");
      }

      // Reset form on success
      setNewBusiness({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        area: "",
        category: "" as BusinessCategory | "",
        overview: "",
        googleBusinessReviewLink: "",
        paymentPlan: "" as "qr-basic" | "qr-plus" | "",
        status: "active" as BusinessStatus,
        paymentExpiryDate: "",
        paymentStatus: undefined,
        services: [],
      });

      setBusinessSearchQuery("");
      setSelectedBusiness(null);
      setSuggestedCategories([]);
      setServiceInput("");

      // Show success message
      alert("Business onboarded successfully!");

      // If QR ID was used, redirect to business dashboard
      if (qrId && data.data?.qr_id) {
        router.push(`/dashboard/business/${data.data.qr_id}`);
      }
    } catch (error: any) {
      console.error("Error onboarding business:", error);
      setOnboardError(error.message || "Failed to onboard business. Please try again.");
    } finally {
      setIsOnboarding(false);
    }
  };


  if (!user || user.role !== "sales-team") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F1FF] via-[#F3EBFF] to-[#EFE5FF]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Onboard Business</h1>
            <p className="text-muted-foreground">Fill in the business details to onboard a new client</p>
            {qrId && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="gap-1.5 px-3 py-1">
                  <QrCode className="h-3.5 w-3.5" />
                  QR ID: <span className="font-mono font-semibold">{qrId}</span>
                </Badge>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <span className="hidden sm:inline">{user.name}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

          </div>
        </div>

        {/* Loading State for Scan Data */}
        {isLoadingScanData && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading business data...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State for Scan Data */}
        {scanError && !isLoadingScanData && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {scanError}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Two-Step Onboarding Flow */}
        {currentStep === 1 ? (
        <div className="grid gap-6 mt-8">
            {/* Step 1: Business Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                  Step 1: Business Analysis
              </CardTitle>
              <CardDescription>
                  Enter the business name to analyze their Google Business Profile reputation score
              </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-6">
                  {/* Business Name Input */}
                  <div className="grid gap-2 relative business-name-input-container">
                    <Label htmlFor="business-name">
                      Business Name <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="business-name"
                        placeholder="e.g., The Coffee House or Mia by Tanishq"
                        value={businessName}
                      onChange={(e) => {
                          const value = e.target.value;
                          setBusinessName(value);
                          // Only show suggestions if we have at least 2 characters and no GBP score
                          if (value.length >= 2 && gbpScore === null) {
                            // The useEffect will handle showing suggestions
                          } else {
                            setShowBusinessNameSuggestions(false);
                            setBusinessNameSuggestions([]);
                        }
                      }}
                      onFocus={() => {
                          // Only show suggestions on focus if:
                          // 1. We have suggestions
                          // 2. No GBP score yet
                          // 3. Business name doesn't exactly match any suggestion (user hasn't selected yet)
                          if (businessNameSuggestions.length > 0 && gbpScore === null) {
                            const exactMatch = businessNameSuggestions.some(
                              (s) => s.structured_formatting.main_text.toLowerCase() === businessName.toLowerCase()
                            );
                            if (!exactMatch) {
                              setShowBusinessNameSuggestions(true);
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && businessName.trim() && !isAnalyzing) {
                            handleAnalyse();
                            setShowBusinessNameSuggestions(false);
                          } else if (e.key === "Escape") {
                            setShowBusinessNameSuggestions(false);
                          }
                        }}
                        disabled={isAnalyzing || gbpScore !== null}
                      className="pl-10"
                    />
                      {isSearchingBusinessName && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>

                    {/* Business Name Suggestions Dropdown */}
                    {showBusinessNameSuggestions && businessNameSuggestions.length > 0 && gbpScore === null && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-md max-h-60 overflow-auto top-full business-name-suggestions-dropdown">
                        {businessNameSuggestions.map((suggestion) => (
                          <div
                            key={suggestion.place_id}
                          className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                            onClick={() => handleSelectBusinessNameSuggestion(suggestion)}
                        >
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                  {suggestion.structured_formatting.main_text}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                  {suggestion.structured_formatting.secondary_text}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                    <p className="text-xs text-muted-foreground">
                      Enter the official business name as it appears on Google Business Profile. Start typing to see suggestions.
                          </p>
                        </div>

                  {/* Analyse Button */}
                  {!gbpScore && (
                        <Button
                      onClick={handleAnalyse}
                      disabled={!businessName.trim() || isAnalyzing}
                      size="lg"
                      className="w-full sm:w-auto"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Analyse
                        </>
                      )}
                        </Button>
                  )}

                  {/* Analysis is now shown on a separate page - /sales-dashboard/analysis-report */}
                  {/* The analysis results are displayed on the analysis-report page */}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 mt-8">
            {/* Step 2: Complete Business Information */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Step 2: Complete Business Information
                </CardTitle>
                <CardDescription>
                  Fill in the remaining business details to complete onboarding
                </CardDescription>
              </CardHeader>
          </Card>

          {/* Basic Information Section */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Enter the essential details about the business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Business Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., The Coffee House"
                    value={newBusiness.name}
                    onChange={(e) => setNewBusiness({ ...newBusiness, name: e.target.value })}
                    required
                    disabled={isLoadingScanData}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the official business name as it appears on legal documents
                  </p>
                </div>

                {/* Dotted Separator */}
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dotted border-muted-foreground/30"></div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="category">
                    Business Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={newBusiness.category}
                    onValueChange={(value) => {
                      setNewBusiness({ ...newBusiness, category: value as BusinessCategory });
                      setServiceInput(""); // Reset service input when category changes
                    }}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select business category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="beauty">Beauty</SelectItem>
                      <SelectItem value="fitness">Fitness</SelectItem>
                      <SelectItem value="automotive">Automotive</SelectItem>
                      <SelectItem value="real-estate">Real Estate</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="hospitality">Hospitality</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Category Suggestions */}
                  {suggestedCategories.length > 0 && !newBusiness.category && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-2">Suggested categories:</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestedCategories.map((cat) => (
                          <Badge
                            key={cat}
                            variant="outline"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                            onClick={() => setNewBusiness({ ...newBusiness, category: cat })}
                          >
                            {cat.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category-specific suggestions */}
                  {newBusiness.category && categorySuggestions[newBusiness.category] && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-2">
                        Common types for {newBusiness.category}:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {categorySuggestions[newBusiness.category].slice(0, 5).map((suggestion) => (
                          <Badge
                            key={suggestion}
                            variant="secondary"
                            className="text-xs"
                          >
                            {suggestion}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Select the primary category that best describes the business
                  </p>
                </div>

                {/* Dotted Separator */}
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dotted border-muted-foreground/30"></div>
                  </div>
                </div>

                {/* Services Section */}
                <div className="grid gap-2">
                  <Label htmlFor="services">Business Services</Label>
                  <div className="relative service-input-container">
                    <Input
                      id="services"
                      placeholder={newBusiness.category ? `Add a service (e.g., ${getServiceSuggestions[0] || "Service name"})` : "Select a category first to see suggestions"}
                      value={serviceInput}
                      onChange={(e) => {
                        setServiceInput(e.target.value);
                        setShowServiceSuggestions(e.target.value.length > 0 && getServiceSuggestions.length > 0);
                      }}
                      onFocus={() => {
                        if (getServiceSuggestions.length > 0) {
                          setShowServiceSuggestions(true);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && serviceInput.trim()) {
                          e.preventDefault();
                          handleAddService(serviceInput);
                        }
                      }}
                      disabled={!newBusiness.category}
                    />

                    {/* Service Suggestions Dropdown */}
                    {showServiceSuggestions && getServiceSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-md max-h-48 overflow-auto top-full service-suggestions-dropdown">
                        {getServiceSuggestions
                          .filter((suggestion) =>
                            suggestion.toLowerCase().includes(serviceInput.toLowerCase())
                          )
                          .map((suggestion) => (
                            <div
                              key={suggestion}
                              className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                              onClick={() => handleAddService(suggestion)}
                            >
                              <div className="flex items-center gap-2">
                                <Plus className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{suggestion}</span>
                              </div>
                            </div>
                          ))}
                        {serviceInput.trim() && !getServiceSuggestions.some(s => s.toLowerCase() === serviceInput.toLowerCase()) && (
                          <div
                            className="p-2 hover:bg-muted cursor-pointer border-t"
                            onClick={() => handleAddService(serviceInput)}
                          >
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">Add "{serviceInput}"</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Service Suggestions */}
                  {newBusiness.category && getServiceSuggestions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-2">Suggested business services:</p>
                      <div className="flex flex-wrap gap-2">
                        {getServiceSuggestions.slice(0, 8).map((suggestion) => (
                          <Badge
                            key={suggestion}
                            variant="outline"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                            onClick={() => handleAddService(suggestion)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {suggestion}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Added Services */}
                  {newBusiness.services.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-2">Added business services:</p>
                      <div className="flex flex-wrap gap-2">
                        {newBusiness.services.map((service) => (
                          <Badge
                            key={service}
                            variant="default"
                            className="cursor-pointer"
                            onClick={() => handleRemoveService(service)}
                          >
                            {service}
                            <X className="h-3 w-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {newBusiness.category
                      ? "Click on suggested business services or type to add custom services"
                      : "Select a business category first to see business service suggestions"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Overview Section */}
          <Card>
            <CardHeader>
              <CardTitle>Business Overview</CardTitle>
              <CardDescription>
                Provide a brief description of the business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="overview">Business Overview</Label>
                  <Textarea
                    id="overview"
                    placeholder="Describe the business, its services, specialties, and what makes it unique..."
                    value={newBusiness.overview}
                    onChange={(e) => setNewBusiness({ ...newBusiness, overview: e.target.value })}
                    className="min-h-[120px] resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    A brief description of the business that will be displayed on the business profile
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information Section */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                Provide contact details for the business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">
                    Business Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contact@business.com"
                    value={newBusiness.email}
                    onChange={(e) => setNewBusiness({ ...newBusiness, email: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Primary email address for business communications
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={newBusiness.phone}
                    onChange={(e) => setNewBusiness({ ...newBusiness, phone: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Include country code (e.g., +91 for India)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Information Section */}
          <Card>
            <CardHeader>
              <CardTitle>Location Information</CardTitle>
              <CardDescription>
                Enter the physical location of the business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main Street, Building Name"
                    value={newBusiness.address}
                    onChange={(e) => setNewBusiness({ ...newBusiness, address: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Complete street address including building number and name
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Mumbai"
                      value={newBusiness.city}
                      onChange={(e) => setNewBusiness({ ...newBusiness, city: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="area">Area / Locality</Label>
                    <Input
                      id="area"
                      placeholder="Bandra"
                      value={newBusiness.area}
                      onChange={(e) => setNewBusiness({ ...newBusiness, area: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Settings Section - Google Review Link */}
          <Card>
            <CardHeader>
              <CardTitle>Business Settings</CardTitle>
              <CardDescription>
                Configure review settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="google-review-link">Google Business Review Link</Label>
                  <Input
                    id="google-review-link"
                    type="url"
                    placeholder="https://g.page/r/your-business/review"
                    value={newBusiness.googleBusinessReviewLink}
                    onChange={(e) => setNewBusiness({ ...newBusiness, googleBusinessReviewLink: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional: Add your Google Business review link to redirect customers after they submit feedback
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plans Section */}
          <Card>
            <CardHeader>
              <CardTitle>Plans</CardTitle>
              <CardDescription>
                Configure payment plan and review settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>
                    Payment Plan <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* QR-Plus Plan */}
                    <Card
                      className={`relative cursor-pointer transition-all ${
                        newBusiness.paymentPlan === "qr-plus" ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setNewBusiness({ ...newBusiness, paymentPlan: "qr-plus" })}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-primary text-primary-foreground">
                              <Crown className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-2xl">QR-Plus</CardTitle>
                                <Badge variant="secondary" className="text-xs">Premium</Badge>
                              </div>
                              <CardDescription>Advanced features for growth</CardDescription>
                              <div className="mt-1">
                                <span className="text-2xl font-bold">₹6,999</span>
                                <span className="text-sm text-muted-foreground">/year</span>
                              </div>
                            </div>
                          </div>
                          {newBusiness.paymentPlan === "qr-plus" && (
                            <Badge variant="default" className="text-xs">
                              Selected
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">All QR-Basic Features, Plus:</h4>
                          <div className="space-y-2">
                            <div className="flex items-start gap-3">
                              <Star className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">Negative Feedback Control & Care</p>
                                <p className="text-xs text-muted-foreground">Proactive management of negative reviews</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Star className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">Positive Feedback Growth</p>
                                <p className="text-xs text-muted-foreground">Strategies to boost positive reviews</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Star className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">SEO Boost</p>
                                <p className="text-xs text-muted-foreground">Enhanced search engine visibility</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Star className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">AI Auto Reply</p>
                                <p className="text-xs text-muted-foreground">Intelligent automated responses</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Star className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">Advanced Analytics</p>
                                <p className="text-xs text-muted-foreground">Deep insights and trend analysis</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Star className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">Priority Support</p>
                                <p className="text-xs text-muted-foreground">24/7 dedicated customer support</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Star className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">Free AI QR Stand</p>
                                <p className="text-xs text-muted-foreground">Free AI QR stand to boost your google reviews</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Star className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">GBP Score Analysis & Insights</p>
                                <p className="text-xs text-muted-foreground">Track your Google Business Profile performance score</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Star className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">SEO Keyword Suggestions</p>
                                <p className="text-xs text-muted-foreground">Location-based keyword recommendations for better rankings</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Star className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">Review Collection Automation</p>
                                <p className="text-xs text-muted-foreground">Fully automated review collection workflows</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Star className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">Direct Review Links</p>
                                <p className="text-xs text-muted-foreground">Generate direct links to your Google review page</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* QR-Basic Plan */}
                    <Card
                      className={`relative cursor-pointer transition-all ${
                        newBusiness.paymentPlan === "qr-basic" ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setNewBusiness({ ...newBusiness, paymentPlan: "qr-basic" })}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-muted">
                              <Shield className="h-6 w-6" />
                            </div>
                            <div>
                              <CardTitle className="text-2xl">QR-Basic</CardTitle>
                              <CardDescription>Essential features for your business</CardDescription>
                              <div className="mt-1">
                                <span className="text-2xl font-bold">₹2,999</span>
                                <span className="text-sm text-muted-foreground">/year</span>
                              </div>
                            </div>
                          </div>
                          {newBusiness.paymentPlan === "qr-basic" && (
                            <Badge variant="default" className="text-xs">
                              Selected
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Features</h4>
                          <div className="space-y-2">
                            <div className="flex items-start gap-3">
                              <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">AI Suggested Feedbacks</p>
                                <p className="text-xs text-muted-foreground">Get intelligent feedback suggestions</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">Hassle-free Review Collection</p>
                                <p className="text-xs text-muted-foreground">Collect reviews in under 30 seconds</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">Dynamic Dashboard</p>
                                <p className="text-xs text-muted-foreground">Real-time insights and analytics</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">No Repetition</p>
                                <p className="text-xs text-muted-foreground">Smart duplicate detection</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">Free AI QR Stand</p>
                                <p className="text-xs text-muted-foreground">Free AI QR stand to boost your google reviews</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">GBP Score Analysis & Insights</p>
                                <p className="text-xs text-muted-foreground">Track your Google Business Profile performance score</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">Direct Review Links</p>
                                <p className="text-xs text-muted-foreground">Generate direct links to your Google review page</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click on a plan card to select it. QR-Plus includes advanced features.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Plan Expiry Date</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-semibold">
                      {newBusiness.paymentExpiryDate
                        ? new Date(newBusiness.paymentExpiryDate).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "Not set"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {newBusiness.paymentStatus === "active"
                      ? "Payment completed successfully"
                      : "Click 'Complete Payment' to process payment"}
                  </p>
                </div>
                <Button
                  size="lg"
                  className="gap-2"
                  disabled={!newBusiness.paymentPlan}
                  onClick={handleCompletePayment}
                >
                  <CreditCard className="h-5 w-5" />
                  Complete Payment
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {onboardError && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {onboardError}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    const newStep = 1;
                    setCurrentStep(newStep);
                    setGbpScore(null);
                    setGbpConnected(false);
                    setBusinessPhoneNumber("");
                    // Update URL to step-1
                    const newUrl = `/sales-dashboard/step-1${qrId ? `?qr=${qrId}` : ''}`;
                    router.push(newUrl);
                  }}
                  disabled={isOnboarding}
                >
                  Back to Step 1
                </Button>
                <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewBusiness({
                        name: businessName || "",
                      email: "",
                      phone: "",
                      address: "",
                      city: "",
                      area: "",
                      category: "" as BusinessCategory | "",
                      overview: "",
                      googleBusinessReviewLink: "",
                      paymentPlan: "" as "qr-basic" | "qr-plus" | "",
                      status: "active" as BusinessStatus,
                      paymentExpiryDate: "",
                      paymentStatus: undefined,
                      services: [],
                    });
                    setBusinessSearchQuery("");
                    setSelectedBusiness(null);
                    setSuggestedCategories([]);
                    setServiceInput("");
                    setOnboardError(null);
                  }}
                  disabled={isOnboarding}
                >
                  Clear Form
                </Button>
                <Button
                  onClick={handleOnboardBusiness}
                  disabled={!newBusiness.name || !newBusiness.email || !newBusiness.category || !newBusiness.paymentPlan || isOnboarding}
                  className="gap-2"
                >
                  {isOnboarding ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Create Business
                    </>
                  )}
                </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={(open) => {
        if (paymentStatus === "success") {
          // Auto-close after showing success for 2 seconds
          setTimeout(() => setShowPaymentDialog(false), 2000);
        } else if (paymentStatus === "pending") {
          // Warn user before closing during pending payment
          if (window.confirm("Payment is still pending. Are you sure you want to close?")) {
            setShowPaymentDialog(false);
          }
        } else {
          setShowPaymentDialog(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {paymentStatus === "success" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Payment Successful
                </>
              ) : paymentStatus === "failed" ? (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Payment Failed
                </>
              ) : paymentStatus === "expired" ? (
                <>
                  <Clock className="h-5 w-5 text-orange-600" />
                  Payment Expired
                </>
              ) : paymentStatus === "pending" && paymentQRCode ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Payment Pending
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  Complete Payment
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {paymentStatus === "pending" && paymentQRCode && "Scan the QR code to complete your payment"}
              {paymentStatus === "pending" && !paymentQRCode && "Generating payment QR code..."}
              {paymentStatus === "success" && "Your payment has been processed successfully"}
              {paymentStatus === "failed" && "Your payment could not be processed"}
              {paymentStatus === "expired" && "The payment session has expired"}
              {!paymentStatus && "Scan the QR code to complete your payment"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Plan Details */}
            {newBusiness.paymentPlan && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {newBusiness.paymentPlan === "qr-plus" ? (
                      <>
                        <Crown className="h-5 w-5 text-primary" />
                        <span className="font-semibold">QR-Plus</span>
                        <Badge variant="secondary" className="text-xs">Premium</Badge>
                      </>
                    ) : (
                      <>
                        <Shield className="h-5 w-5" />
                        <span className="font-semibold">QR-Basic</span>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      ₹{newBusiness.paymentPlan === "qr-plus" ? "6,999" : "2,999"}
                    </div>
                    <div className="text-xs text-muted-foreground">per year</div>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Business:</span>
                  <span className="font-medium">{newBusiness.name || "New Business"}</span>
                </div>
              </div>
            )}

            {/* Payment Status */}
            {paymentStatus === "pending" && (
              <>
                {paymentQRCode ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center p-6 border-2 border-dashed rounded-lg bg-white">
                      <img
                        src={paymentQRCode}
                        alt="Payment QR Code"
                        className="max-w-[250px] h-auto"
                      />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm font-medium">Scan with your UPI app</p>
                      <p className="text-xs text-muted-foreground">
                        Time remaining: {Math.floor(paymentTimer / 60)}:{(paymentTimer % 60).toString().padStart(2, "0")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Waiting for payment confirmation...</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center space-y-2">
                      <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Generating payment QR code...</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {paymentStatus === "success" && (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">Payment Successful!</h3>
                  <p className="text-sm text-muted-foreground">
                    Your payment has been processed. You can now create the business.
                  </p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Plan expires:</span>
                    <span className="font-medium">
                      {newBusiness.paymentExpiryDate
                        ? new Date(newBusiness.paymentExpiryDate).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "1 year from now"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {paymentStatus === "failed" && (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">Payment Failed</h3>
                  <p className="text-sm text-muted-foreground">
                    Your payment could not be processed. Please try again.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setPaymentStatus("pending");
                    setPaymentQRCode(null);
                    setPaymentTimer(900);
                    setPaymentSessionId(null);
                  }}
                  className="w-full"
                >
                  Try Again
                </Button>
              </div>
            )}

            {paymentStatus === "expired" && (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                  <Clock className="h-10 w-10 text-orange-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">Payment Expired</h3>
                  <p className="text-sm text-muted-foreground">
                    The payment session has expired. Please start a new payment.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setPaymentStatus("pending");
                    setPaymentQRCode(null);
                    setPaymentTimer(900);
                    setPaymentSessionId(null);
                  }}
                  className="w-full"
                >
                  Start New Payment
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SalesDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#F7F1FF] via-[#F3EBFF] to-[#EFE5FF] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <SalesDashboardContent />
    </Suspense>
  );
}
