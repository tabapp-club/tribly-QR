"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mockBusinesses, getReviewsByBusinessId } from "@/lib/mock-data";
import { Business, BusinessCategory, ReviewCategory, Review } from "@/lib/types";
import { generateShortUrlCode, generateReviewUrl, generateQRCodeDataUrl, downloadQRCodeAsPNG } from "@/lib/qr-utils";
import { getBusinessBySlug } from "@/lib/business-slug";
import { getStoredUser, logout, setStoredUser, getAuthToken } from "@/lib/auth";
import { categorySuggestions, serviceSuggestions } from "@/lib/category-suggestions";
import { Toast } from "@/components/ui/toast";
import { OverviewTab } from "@/components/dashboard/business/OverviewTab";
import { KeywordsTab } from "@/components/dashboard/business/KeywordsTab";
import {
  ArrowLeft,
  Upload,
  CreditCard,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Image as ImageIcon,
  Copy,
  ExternalLink,
  Sparkles,
  Zap,
  Shield,
  Crown,
  MessageSquare,
  TrendingUp,
  Brain,
  Repeat,
  Search,
  Bot,
  Star,
  Check,
  User,
  Users,
  Mail,
  Phone,
  Calendar,
  Hash,
  X as XIcon,
  Plus as PlusIcon,
  LogOut,
  Loader2,
  AlertCircle,
  Activity,
  Target,
  TrendingDown,
  Award,
  Eye,
  FileText,
  MapPin,
  Globe,
  Navigation,
  FileImage,
  CheckCircle,
  AlertTriangle,
  Plus,
  X,
  Trash2,
  Pencil,
} from "lucide-react";

export default function BusinessDetailPage() {
  const router = useRouter();
  const params = useParams();
  const businessSlug = params.id as string;
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [reviewUrl, setReviewUrl] = useState<string>("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [selectedReviewFilter, setSelectedReviewFilter] = useState<ReviewCategory | null>(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [newService, setNewService] = useState("");
  const [suggestionsLimit, setSuggestionsLimit] = useState(12);
  const [isBusinessOwner, setIsBusinessOwner] = useState(false);
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getStoredUser>>(null);

  // Category suggestions state
  const [suggestedCategories, setSuggestedCategories] = useState<BusinessCategory[]>([]);

  // Services state for enhanced form
  const [serviceInput, setServiceInput] = useState("");
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "failed" | "expired">("pending");
  const [paymentQRCode, setPaymentQRCode] = useState<string | null>(null);
  const [paymentTimer, setPaymentTimer] = useState(900); // 15 minutes in seconds
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
  const [website, setWebsite] = useState<string>("");
  const [isQRId, setIsQRId] = useState(false);
  const [apiReviews, setApiReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  // Team Management state
  const [teamUsers, setTeamUsers] = useState<Array<{ id: string; email: string; name?: string; created_at: string }>>([]);
  const [isLoadingTeamUsers, setIsLoadingTeamUsers] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [isAddingUser, setIsAddingUser] = useState(false);
  // Update user state
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: string; email: string; name?: string } | null>(null);
  const [updateUserName, setUpdateUserName] = useState("");
  const [updateUserEmail, setUpdateUserEmail] = useState("");
  const [updateUserPassword, setUpdateUserPassword] = useState("");
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  useEffect(() => {
    const loadBusinessData = async () => {
      // First, try to find business by slug (existing businesses)
      let businessData = getBusinessBySlug(businessSlug, mockBusinesses);

      // If not found by slug, try as ID (for backward compatibility)
      if (!businessData) {
        businessData = mockBusinesses.find(b => b.id === businessSlug) || undefined;
      }

      // If still not found, treat it as a QR ID and fetch from API
      if (!businessData) {
        setIsQRId(true);
        try {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.tribly.ai";
          const response = await fetch(`${apiBaseUrl}/dashboard/v1/business_qr/scan?qr_id=${businessSlug}`);

          if (!response.ok) {
            console.error("Failed to fetch business QR data");
            setIsLoading(false);
            return;
          }

          const apiResponse = await response.json();
          const qrData = apiResponse.data;

          // Map API response to Business type
          const mappedBusiness: Business = {
            id: businessSlug,
            name: qrData.business_name || "",
            status: "active",
            category: (qrData.business_category as BusinessCategory) || "other",
            email: qrData.business_contact?.email || "",
            phone: qrData.business_contact?.phone || "",
            address: qrData.business_address?.address_line1 || "",
            city: qrData.business_address?.city || "",
            area: qrData.business_address?.area || "",
            overview: qrData.business_description || "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            reviewUrl: qrData.business_review_url || "",
            googleBusinessReviewLink: qrData.business_google_review_url || "",
            keywords: Array.isArray(qrData.business_tags) ? qrData.business_tags : [],
            feedbackTone: "professional",
            autoReplyEnabled: false,
            paymentPlan: (qrData.plan === "qr-plus" || qrData.plan === "qr-basic") ? qrData.plan : undefined,
            totalReviews: 0,
            activeReviews: 0,
            inactiveReviews: 0,
            reviewsInQueue: 0,
          };

          setBusiness(mappedBusiness);
          setWebsite(qrData.business_website || "");
          setReviewUrl(qrData.business_review_url || "");

          // Use business_qr_code_url from API if available, otherwise generate QR code
          if (qrData.business_qr_code_url) {
            setQrCodeDataUrl(qrData.business_qr_code_url);
            setBusiness((prev) => prev ? { ...prev, qrCodeUrl: qrData.business_qr_code_url } : null);
          } else if (qrData.business_review_url) {
            // Fallback: Generate QR code if review URL exists but no QR code URL provided
            generateQRCodeDataUrl(qrData.business_review_url).then((dataUrl) => {
              setQrCodeDataUrl(dataUrl);
              setBusiness((prev) => prev ? { ...prev, qrCodeUrl: dataUrl } : null);
            }).catch((error) => {
              console.error("Error generating QR code:", error);
            });
          }

          const user = getStoredUser();
          setCurrentUser(user);
          setIsLoading(false);

          // Fetch manual reviews from API
          await fetchManualReviews(businessSlug);
          return;
        } catch (error) {
          console.error("Error fetching business QR data:", error);
          setIsLoading(false);
          return;
        }
      }

      // Existing business logic
      if (businessData) {
        setBusiness(businessData);

        // Check if logged-in user is the business owner
        const user = getStoredUser();
        if (user && user.role === "business" && user.businessId === businessData.id) {
          setIsBusinessOwner(true);
        }
        setCurrentUser(user);

        // Generate unique review URL and QR code
        const code = generateShortUrlCode(businessData.id);
        const url = generateReviewUrl(code);
        setReviewUrl(url);

        // Generate QR code
        generateQRCodeDataUrl(url).then((dataUrl) => {
          setQrCodeDataUrl(dataUrl);
          // Update business with review URL and QR code
          setBusiness((prev) => prev ? { ...prev, reviewUrl: url, qrCodeUrl: dataUrl } : null);
        }).catch((error) => {
          console.error("Error generating QR code:", error);
        });
      } else {
        // Business not found, redirect based on user role
        const user = getStoredUser();
        if (user && user.role === "business") {
          // Business owner trying to access non-existent business, redirect to login
          router.push("/login");
        } else {
        router.push("/dashboard");
        }
      }
      setIsLoading(false);
    };

    loadBusinessData();
  }, [businessSlug, router]);

  // Reset suggestions limit when business or keywords change
  useEffect(() => {
    setSuggestionsLimit(12);
  }, [business?.id, business?.keywords]);

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
            // Update business with new expiry date (1 year from now)
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            handleUpdateBusiness({
              paymentExpiryDate: expiryDate.toISOString(),
              paymentStatus: "active",
            });
            setToastMessage("Payment processed successfully!");
            setShowToast(true);
          } else {
            setPaymentStatus("failed");
          }
        }, delay);
      };
      checkPayment();
    }
  }, [showPaymentDialog, paymentStatus, paymentSessionId]);

  // Fetch team users when team management tab is active
  useEffect(() => {
    if (
      activeTab === "team-management" &&
      currentUser &&
      (currentUser.role === "admin" || currentUser.userType === "admin") &&
      business
    ) {
      fetchTeamUsers();
    }
  }, [activeTab, currentUser, business]);

  // Generate payment QR code when dialog opens
  useEffect(() => {
    if (showPaymentDialog && business && !paymentQRCode) {
      const generatePaymentQR = async () => {
        try {
          const planPrice = business.paymentPlan === "qr-plus" ? "6999" : "2999";
          const planName = business.paymentPlan === "qr-plus" ? "QR-Plus" : "QR-Basic";
          const sessionId = `payment-${business.id}-${Date.now()}`;
          setPaymentSessionId(sessionId);

          // Generate UPI payment URL (format: upi://pay?pa=merchant@upi&pn=MerchantName&am=Amount&cu=INR&tn=TransactionNote)
          // For demo, we'll use a generic payment URL
          const paymentUrl = `upi://pay?pa=tribly@pay&pn=Tribly%20QR&am=${planPrice}&cu=INR&tn=${planName}%20Subscription%20-%20${business.name}`;

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
  }, [showPaymentDialog, business, paymentQRCode]);

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

  // Fetch manual reviews from API
  const fetchManualReviews = async (qrId: string) => {
    setIsLoadingReviews(true);
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.tribly.ai";

      // Get auth token
      const authToken = getAuthToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add auth token to headers if available
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${apiBaseUrl}/dashboard/v1/business_qr/manual_reviews?qr_id=${qrId}`, {
        headers,
      });

      if (!response.ok) {
        console.error("Failed to fetch manual reviews");
        setIsLoadingReviews(false);
        return;
      }

      const apiResponse = await response.json();
      // API returns array directly or wrapped in data property
      const reviewsData = Array.isArray(apiResponse) ? apiResponse : (apiResponse.data || apiResponse.reviews || []);

      // Map API response to Review type
      const mappedReviews: Review[] = reviewsData.map((review: any, index: number) => {
        // Parse contact - could be email or phone
        const contact = review.contact || "";
        const isEmail = contact.includes("@");

        return {
          id: `api-review-${index}-${review.created_at || Date.now()}`,
          businessId: qrId,
          rating: "need-improvement" as const, // Manual reviews are from "Need Improvement" rating
          feedback: review.feedback || "",
          category: "customer-experience" as ReviewCategory, // Default category
          customerName: review.name || "",
          customerEmail: isEmail ? contact : undefined,
          customerPhone: !isEmail ? contact : undefined,
          status: "pending" as const,
          autoReplySent: false,
          createdAt: review.created_at || new Date().toISOString(),
        };
      });

      setApiReviews(mappedReviews);
    } catch (error) {
      console.error("Error fetching manual reviews:", error);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  // Get all reviews for the business
  const allReviews = useMemo(() => {
    if (!business) return [];
    // If it's a QR ID, use API reviews (even if empty), otherwise use mock reviews
    if (isQRId) {
      return apiReviews;
    }
    return getReviewsByBusinessId(business.id);
  }, [business, isQRId, apiReviews]);

  // Filter reviews based on selected category
  const filteredReviews = useMemo(() => {
    if (!selectedReviewFilter) return allReviews;
    return allReviews.filter((review) => review.category === selectedReviewFilter);
  }, [allReviews, selectedReviewFilter]);

  const reviewFilters: { id: ReviewCategory; label: string }[] = [
    { id: "product", label: "Product" },
    { id: "staff", label: "Staff" },
    { id: "customer-experience", label: "Customer Experience" },
    { id: "offers-discounts", label: "Offers & Discounts" },
  ];

  const handleUpdateBusiness = (updates: Partial<Business>) => {
    if (business) {
      setBusiness({ ...business, ...updates });
    }
  };

  // Helper function to convert rating string to number
  const ratingToNumber = (rating: "excellent" | "good" | "average" | "need-improvement"): number => {
    switch (rating) {
      case "excellent":
        return 5;
      case "good":
        return 4;
      case "average":
        return 3;
      case "need-improvement":
        return 2;
      default:
        return 0;
    }
  };

  // Fetch team users for the business
  const fetchTeamUsers = async () => {
    if (!currentUser || (currentUser.role !== "admin" && currentUser.userType !== "admin")) {
      return;
    }

    setIsLoadingTeamUsers(true);
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.tribly.ai";
      const authToken = getAuthToken();

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(
        `${apiBaseUrl}/dashboard/v1/business_qr/business_team?qr_id=${businessSlug}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch team users");
      }

      const data = await response.json();
      if (data.status === "success" && data.data) {
        setTeamUsers(data.data);
      } else {
        setTeamUsers([]);
      }
    } catch (error) {
      console.error("Error fetching team users:", error);
      setTeamUsers([]);
    } finally {
      setIsLoadingTeamUsers(false);
    }
  };

  const sendKeywordsToAPI = async (keywords: string[]) => {
    if (!isQRId || !business) return;

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.tribly.ai";

      // Prepare payload with tags as array of strings
      const payload: any = {
        name: business.name,
        description: business.overview || null,
        website: website || null,
        email: business.email || null,
        phone: business.phone || null,
        category: business.category || null,
        google_review_url: business.googleBusinessReviewLink || null,
        qr_id: businessSlug,
        tags: keywords, // Send keywords as tags array
      };

      // Only include address if address_line1 is provided (required field)
      if (business.address) {
        payload.address = {
          address_line1: business.address,
          address_line2: null,
          city: business.city || "",
          area: business.area || "",
        };
      }

      // Get auth token
      const authToken = getAuthToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add auth token to headers if available
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${apiBaseUrl}/dashboard/v1/business_qr/configure_qr`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save keywords");
      }
    } catch (error) {
      console.error("Error sending keywords to API:", error);
      // Don't show error toast on every keyword add/remove to avoid spam
    }
  };

  const handleAddKeyword = async () => {
    if (newKeyword.trim() && business) {
      const trimmedKeyword = newKeyword.trim();
      const currentKeywords = business.keywords || [];

      // Check if keyword already exists (case-insensitive)
      if (currentKeywords.some(k => k.toLowerCase() === trimmedKeyword.toLowerCase())) {
        setToastMessage("Keyword already exists");
        setShowToast(true);
        return;
      }

      const updatedKeywords = [...currentKeywords, trimmedKeyword];
      handleUpdateBusiness({
        keywords: updatedKeywords
      });
      setNewKeyword("");

      // Send keywords to API
      await sendKeywordsToAPI(updatedKeywords);
    }
  };

  const handleRemoveKeyword = async (keywordToRemove: string) => {
    if (business && business.keywords) {
      const updatedKeywords = business.keywords.filter(k => k !== keywordToRemove);
      handleUpdateBusiness({
        keywords: updatedKeywords
      });

      // Send updated keywords to API
      await sendKeywordsToAPI(updatedKeywords);
    }
  };

  const handleAddService = () => {
    if (newService.trim() && business) {
      const trimmedService = newService.trim();
      const currentServices = business.services || [];

      // Check if service already exists (case-insensitive)
      if (currentServices.some(s => s.toLowerCase() === trimmedService.toLowerCase())) {
        setToastMessage("Service already exists");
        setShowToast(true);
        return;
      }

      handleUpdateBusiness({
        services: [...currentServices, trimmedService]
      });
      setNewService("");
    }
  };

  const handleRemoveService = (serviceToRemove: string) => {
    if (business && business.services) {
      handleUpdateBusiness({
        services: business.services.filter(s => s !== serviceToRemove)
      });
    }
  };


  // Get service suggestions based on category
  const getServiceSuggestions = useMemo(() => {
    if (!business?.category) return [];
    return serviceSuggestions[business.category] || [];
  }, [business?.category]);

  // Enhanced add service handler
  const handleAddServiceEnhanced = (service: string) => {
    if (!business) return;

    if (service.trim() && !business.services?.includes(service.trim())) {
      const currentServices = business.services || [];
      handleUpdateBusiness({
        services: [...currentServices, service.trim()],
      });
      setServiceInput("");
      setShowServiceSuggestions(false);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.service-input-container') && !target.closest('.service-suggestions-dropdown')) {
        setShowServiceSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate service suggestions based on previous services from other businesses in the same category
  const suggestedServices = useMemo(() => {
    if (!business) return [];

    const currentServices = business.services || [];
    const suggestions: string[] = [];

    // Get all services from other businesses in the same category
    const otherBusinesses = mockBusinesses.filter(
      b => b.id !== business.id && b.category === business.category && b.services && b.services.length > 0
    );

    // Collect all unique services from other businesses
    const serviceFrequency = new Map<string, number>();
    otherBusinesses.forEach(b => {
      b.services?.forEach(service => {
        const normalizedService = service.toLowerCase();
        serviceFrequency.set(normalizedService, (serviceFrequency.get(normalizedService) || 0) + 1);
      });
    });

    // Sort by frequency and add to suggestions
    const sortedServices = Array.from(serviceFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([service]) => {
        // Find original casing from businesses
        const originalService = otherBusinesses
          .flatMap(b => b.services || [])
          .find(s => s.toLowerCase() === service);
        return originalService || service;
      })
      .filter(service =>
        !currentServices.some(s => s.toLowerCase() === service.toLowerCase())
      );

    suggestions.push(...sortedServices);

    // Add category-based default suggestions if no other businesses have services
    if (suggestions.length === 0) {
      const categoryServices: Record<string, string[]> = {
        restaurant: ["Dine-in", "Takeout", "Delivery", "Catering", "Private Events", "Breakfast", "Lunch", "Dinner"],
        retail: ["Product Sales", "Gift Wrapping", "Personal Shopping", "Layaway", "Returns & Exchanges"],
        healthcare: ["Consultation", "Diagnostics", "Treatment", "Preventive Care", "Emergency Services"],
        beauty: ["Haircut", "Hair Color", "Styling", "Manicure", "Pedicure", "Facial", "Massage", "Makeup"],
        fitness: ["Personal Training", "Group Classes", "Cardio Equipment", "Weight Training", "Yoga", "Pilates"],
        automotive: ["Oil Change", "Brake Service", "Tire Replacement", "Engine Repair", "AC Service"],
        "real-estate": ["Property Sales", "Rentals", "Property Management", "Consultation", "Home Staging"],
        education: ["Classes", "Tutoring", "Test Preparation", "Online Courses", "Certification Programs"],
        hospitality: ["Room Booking", "Event Venue", "Catering", "Concierge Services", "Airport Shuttle"],
        other: ["Consultation", "Custom Services", "Support", "Maintenance"]
      };

      if (business.category && categoryServices[business.category]) {
        suggestions.push(...categoryServices[business.category]);
      }
    }

    return suggestions;
  }, [business]);

  // Generate SEO-optimized suggested keywords based on business category, location, and name
  const suggestedKeywords = useMemo(() => {
    if (!business) return [];

    const suggestions: string[] = [];
    const currentKeywords = business.keywords || [];

    // SEO-focused category-based keyword suggestions
    const categoryKeywords: Record<string, string[]> = {
      restaurant: [
        "best restaurant", "top dining", "authentic cuisine", "fine dining",
        "family restaurant", "casual dining", "restaurant near me",
        "local restaurant", "popular restaurant", "restaurant reviews",
        "delicious food", "fresh ingredients", "chef special", "menu items"
      ],
      retail: [
        "best shop", "top store", "quality products", "affordable prices",
        "retail store near me", "local shop", "popular store",
        "best deals", "shopping destination", "product reviews",
        "customer service", "wide selection", "premium quality"
      ],
      healthcare: [
        "best clinic", "top doctor", "medical care", "health services",
        "healthcare near me", "experienced doctor", "quality treatment",
        "patient care", "medical consultation", "health checkup",
        "professional medical", "trusted healthcare", "expert doctor"
      ],
      beauty: [
        "best salon", "top beauty", "professional styling", "beauty services",
        "salon near me", "skincare treatment", "hair salon", "beauty spa",
        "makeup services", "beauty experts", "luxury salon", "beauty care"
      ],
      fitness: [
        "best gym", "top fitness", "personal training", "fitness center",
        "gym near me", "workout facility", "fitness classes", "health club",
        "exercise training", "fitness experts", "modern gym", "fitness programs"
      ],
      automotive: [
        "best auto service", "top garage", "car repair", "auto maintenance",
        "automotive near me", "car service center", "vehicle repair",
        "auto experts", "quality service", "trusted mechanic", "car care"
      ],
      "real-estate": [
        "best real estate", "top property", "real estate agent", "property listings",
        "real estate near me", "home for sale", "property investment",
        "realty services", "property experts", "housing solutions", "real estate agency"
      ],
      education: [
        "best school", "top education", "quality education", "learning center",
        "education near me", "expert teachers", "educational programs",
        "academic excellence", "student success", "education services", "learning academy"
      ],
      hospitality: [
        "best hotel", "top accommodation", "luxury stay", "hotel booking",
        "hotel near me", "comfortable stay", "hospitality services",
        "guest services", "quality accommodation", "popular hotel", "hotel reviews"
      ],
      other: [
        "best service", "top business", "quality service", "professional service",
        "service near me", "trusted business", "customer satisfaction",
        "expert service", "reliable business", "quality work", "professional team"
      ]
    };

    // Add category-based SEO keywords
    if (business.category && categoryKeywords[business.category]) {
      suggestions.push(...categoryKeywords[business.category]);
    }

    // Add high-value location-based SEO keywords
    if (business.city) {
      const cityName = business.city;
      const categoryName = business.category.charAt(0).toUpperCase() + business.category.slice(1);

      // Long-tail location keywords (high SEO value)
      suggestions.push(
        `best ${business.category} in ${cityName}`,
        `top ${business.category} ${cityName}`,
        `${business.category} ${cityName}`,
        `${categoryName} near ${cityName}`,
        `${business.category} ${cityName} reviews`
      );

      if (business.area) {
        suggestions.push(
          `best ${business.category} ${business.area}`,
          `${business.category} in ${business.area}`,
          `${business.area} ${business.category}`,
          `${business.category} near ${business.area} ${cityName}`
        );
      }
    }

    // Add business name-based SEO keywords
    const nameWords = business.name.toLowerCase().split(/\s+/);
    if (nameWords.length > 0) {
      const businessName = business.name;
      suggestions.push(
        `${businessName} reviews`,
        `${businessName} ${business.category}`,
        `visit ${businessName}`,
        `${businessName} location`
      );
    }

    // Add high-intent action keywords
    suggestions.push(
      "book now",
      "contact us",
      "get quote",
      "visit us",
      "call today"
    );

    // Filter out keywords that are already added (case-insensitive)
    const filtered = suggestions.filter(
      keyword => !currentKeywords.some(k => k.toLowerCase() === keyword.toLowerCase())
    );

    // Return all filtered suggestions (will be limited in display)
    return filtered;
  }, [business]);

  // Display limited suggestions based on suggestionsLimit
  const displayedSuggestions = useMemo(() => {
    return suggestedKeywords.slice(0, suggestionsLimit);
  }, [suggestedKeywords, suggestionsLimit]);

  const handleSaveChanges = async (section: string) => {
    if (!business) return;

    // If it's a QR ID, save via API
    if (isQRId) {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.tribly.ai";

        // Prepare payload according to API specification
        const payload: any = {
          name: business.name,
          description: business.overview || null,
          website: website || null,
          email: business.email || null,
          phone: business.phone || null,
          category: business.category || null,
          google_review_url: business.googleBusinessReviewLink || null,
          qr_id: businessSlug,
        };

        // Include tags (keywords) when saving keywords section
        if (section === "Keywords") {
          payload.tags = business.keywords || [];
        }

        // Only include address if address_line1 is provided (required field)
        if (business.address) {
          payload.address = {
            address_line1: business.address,
            address_line2: null,
            city: business.city || "",
            area: business.area || "",
          };
        }

        // Get auth token
        const authToken = getAuthToken();
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };

        // Add auth token to headers if available
        if (authToken) {
          headers["Authorization"] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${apiBaseUrl}/dashboard/v1/business_qr/configure_qr`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to save business QR configuration");
        }

        setToastMessage(`${section} saved successfully!`);
        setShowToast(true);
      } catch (error) {
        console.error("Error saving business QR configuration:", error);
        setToastMessage(error instanceof Error ? error.message : "Failed to save changes");
        setShowToast(true);
      }
    } else {
      setToastMessage(`${section} saved successfully!`);
      setShowToast(true);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real app, this would upload to a server
      const reader = new FileReader();
      reader.onloadend = () => {
        handleUpdateBusiness({ qrCodeUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToastMessage("Copied to clipboard!");
      setShowToast(true);
    } catch (err) {
      console.error("Failed to copy text:", err);
      // Fallback for older browsers
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (successful) {
          setToastMessage("Copied to clipboard!");
          setShowToast(true);
        } else {
          setToastMessage("Failed to copy to clipboard");
          setShowToast(true);
        }
      } catch (fallbackErr) {
        console.error("Fallback copy failed:", fallbackErr);
        setToastMessage("Failed to copy to clipboard");
        setShowToast(true);
      }
    }
  };

  const handleDownloadQR = async () => {
    if (qrCodeDataUrl && business) {
      const filename = `${business.name.replace(/\s+/g, "-").toLowerCase()}-qr-code.png`;

      // If it's a data URL, use it directly
      if (qrCodeDataUrl.startsWith("data:")) {
        downloadQRCodeAsPNG(qrCodeDataUrl, filename);
      } else {
        // If it's a regular URL, fetch it and convert to blob for download
        try {
          const response = await fetch(qrCodeDataUrl);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = filename;
          link.href = blobUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        } catch (error) {
          console.error("Error downloading QR code:", error);
          // Fallback: try direct download
          const link = document.createElement("a");
          link.download = filename;
          link.href = qrCodeDataUrl;
          link.target = "_blank";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F7F1FF] via-[#F3EBFF] to-[#EFE5FF] flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F7F1FF] via-[#F3EBFF] to-[#EFE5FF] flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Business Not Found</CardTitle>
            <CardDescription>The business you're looking for doesn't exist.</CardDescription>
          </CardHeader>
          <CardContent>
            {currentUser?.userType !== "business_qr_user" && (
              <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: Business["status"]) => {
    const variants = {
      active: "default",
      inactive: "secondary",
    } as const;

    const icons = {
      active: <CheckCircle2 className="h-3 w-3 mr-1" />,
      inactive: <XCircle className="h-3 w-3 mr-1" />,
    };

    return (
      <Badge variant={variants[status]} className="flex items-center gap-1">
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleLogout = async () => {
    await logout();
    setStoredUser(null);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F1FF] via-[#F3EBFF] to-[#EFE5FF]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          {!isBusinessOwner && currentUser?.userType !== "business_qr_user" && (
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          )}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{business.name}</h1>
                {getStatusBadge(business.status)}
              </div>
              <p className="text-muted-foreground">{business.email}</p>
            </div>
            {currentUser && (
              <Button
                variant="outline"
                onClick={handleLogout}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col lg:flex-row gap-6">
          <TabsList className="flex flex-col lg:w-64 w-full bg-white/80 backdrop-blur-sm border border-purple-100 p-2 rounded-lg shadow-sm h-fit space-y-1">
            <TabsTrigger
              value="overview"
              className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all py-3 h-auto"
            >
              <div className="flex items-start gap-3 w-full">
                <Activity className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col items-start gap-0.5 flex-1">
                  <span className="font-medium">Overview</span>
                  <span className="text-xs opacity-70">Business details & info</span>
                </div>
              </div>
            </TabsTrigger>
            {/* <TabsTrigger
              value="gmb-health"
              className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all py-3 h-auto"
            >
              <div className="flex items-start gap-3 w-full">
                <Target className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col items-start gap-0.5 flex-1">
                  <span className="font-medium">Google Business Health</span>
                  <span className="text-xs opacity-70">Profile performance</span>
                </div>
              </div>
            </TabsTrigger> */}
            <TabsTrigger
              value="keywords"
              className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all py-3 h-auto"
            >
              <div className="flex items-start gap-3 w-full">
                <Hash className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col items-start gap-0.5 flex-1">
                  <span className="font-medium">Keywords</span>
                  <span className="text-xs opacity-70">Manage search terms</span>
                </div>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="links"
              className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all py-3 h-auto"
            >
              <div className="flex items-start gap-3 w-full">
                <ExternalLink className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col items-start gap-0.5 flex-1">
                  <span className="font-medium">Links & QR</span>
                  <span className="text-xs opacity-70">Review URLs & codes</span>
                </div>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="auto-reply"
              className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all py-3 h-auto"
            >
              <div className="flex items-start gap-3 w-full">
                <Bot className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col items-start gap-0.5 flex-1">
                  <span className="font-medium">Auto Reply</span>
                  <span className="text-xs opacity-70">Automated responses</span>
                </div>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all py-3 h-auto"
            >
              <div className="flex items-start gap-3 w-full">
                <Star className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col items-start gap-0.5 flex-1">
                  <span className="font-medium">Reviews</span>
                  <span className="text-xs opacity-70">Customer feedback</span>
                </div>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="auto-qr-impact"
              className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all py-3 h-auto"
            >
              <div className="flex items-start gap-3 w-full">
                <TrendingUp className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col items-start gap-0.5 flex-1">
                  <span className="font-medium">Auto QR Impact</span>
                  <span className="text-xs opacity-70">ROI & performance</span>
                </div>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="payment"
              className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all py-3 h-auto"
            >
              <div className="flex items-start gap-3 w-full">
                <CreditCard className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col items-start gap-0.5 flex-1">
                  <span className="font-medium">Payment</span>
                  <span className="text-xs opacity-70">Billing & subscription</span>
                </div>
              </div>
            </TabsTrigger>
            {currentUser && (currentUser.role === "admin" || currentUser.userType === "admin") && (
              <TabsTrigger
                value="team-management"
                className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all py-3 h-auto"
              >
                <div className="flex items-start gap-3 w-full">
                  <Users className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex flex-col items-start gap-0.5 flex-1">
                    <span className="font-medium">Team Management</span>
                    <span className="text-xs opacity-70">Manage team users</span>
                  </div>
                </div>
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex-1 min-w-0">
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            <OverviewTab
              business={business}
              handleUpdateBusiness={handleUpdateBusiness}
              handleSaveChanges={handleSaveChanges}
              website={website}
              setWebsite={setWebsite}
              suggestedCategories={suggestedCategories}
              categorySuggestions={categorySuggestions}
              serviceInput={serviceInput}
              setServiceInput={setServiceInput}
              showServiceSuggestions={showServiceSuggestions}
              setShowServiceSuggestions={setShowServiceSuggestions}
              getServiceSuggestions={getServiceSuggestions}
              handleAddServiceEnhanced={handleAddServiceEnhanced}
              handleRemoveService={handleRemoveService}
            />
          </TabsContent>

          {/* GMB Health Tab */}
          <TabsContent value="gmb-health" className="space-y-6 mt-0">
            {/* Visibility Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Visibility Metrics
                </CardTitle>
                <CardDescription>Your business visibility and search performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-50/50 border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">Ranking</Label>
                      <Award className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold mb-1">#3</div>
                    <p className="text-xs text-muted-foreground">Local pack position</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      <span>Up 2 spots</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">Search Impressions</Label>
                      <Search className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-2xl font-bold mb-1">12.4K</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      <span>+18% vs last month</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">Map Views vs Search</Label>
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-2xl font-bold mb-1">65/35</div>
                    <p className="text-xs text-muted-foreground">Map 65% | Search 35%</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                      <BarChart3 className="h-3 w-3" />
                      <span>Balanced distribution</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">Direct vs Discovery</Label>
                      <Target className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-2xl font-bold mb-1">42/58</div>
                    <p className="text-xs text-muted-foreground">Direct 42% | Discovery 58%</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      <span>+5% discovery</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trust & Reputation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Trust & Reputation
                </CardTitle>
                <CardDescription>Review performance and customer trust indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-50/50 border border-yellow-100">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">Average Rating</Label>
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    </div>
                    <div className="text-2xl font-bold mb-1">4.7</div>
                    <p className="text-xs text-muted-foreground">Out of 5.0</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      <span>+0.2 this month</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">Total Reviews</Label>
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-2xl font-bold mb-1">245</div>
                    <p className="text-xs text-muted-foreground">All time</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      <span>+12 this month</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">Review Velocity</Label>
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-2xl font-bold mb-1">12</div>
                    <p className="text-xs text-muted-foreground">Reviews/month</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      <span>+3 vs last month</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">% Reviews Responded</Label>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-2xl font-bold mb-1">94%</div>
                    <p className="text-xs text-muted-foreground">230 of 245</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      <span>Excellent</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">Response Time</Label>
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-2xl font-bold mb-1">4.2h</div>
                    <p className="text-xs text-muted-foreground">Average</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <TrendingDown className="h-3 w-3" />
                      <span>-0.8h faster</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Completeness */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Profile Completeness
                </CardTitle>
                <CardDescription>Your Google Business profile completion status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">Business Description</Label>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-2xl font-bold">Complete</div>
                      <Badge variant="default" className="bg-green-600">100%</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">280 characters</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">Categories</Label>
                      <Hash className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-2xl font-bold">2</div>
                      <Badge variant="default" className="bg-green-600">Complete</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Primary + 1 secondary</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">Services/Products</Label>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-2xl font-bold">8</div>
                      <Badge variant="default" className="bg-green-600">Added</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Items listed</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">Photos</Label>
                      <FileImage className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-2xl font-bold">42</div>
                      <Badge variant="default" className="bg-blue-600">Good</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Last updated 3 days ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Posts Frequency */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Posts Frequency
                </CardTitle>
                <CardDescription>Your Google Business posts activity and frequency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-50/50 border border-purple-100">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">This Month</Label>
                      <MessageSquare className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="text-2xl font-bold mb-1">8</div>
                    <p className="text-xs text-muted-foreground">Posts published</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      <span>On track (target: 8)</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">Last 30 Days</Label>
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-2xl font-bold mb-1">2.1/wk</div>
                    <p className="text-xs text-muted-foreground">Average frequency</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                      <BarChart3 className="h-3 w-3" />
                      <span>Consistent</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">Last Post</Label>
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-2xl font-bold mb-1">2d</div>
                    <p className="text-xs text-muted-foreground">Days ago</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      <span>Recent</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Engagement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Engagement
                </CardTitle>
                <CardDescription>Customer engagement and interaction metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-50/50 border border-green-100">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">Calls</Label>
                      <Phone className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-2xl font-bold mb-1">342</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      <span>+24% vs last month</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">Website Clicks</Label>
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-2xl font-bold mb-1">1,248</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      <span>+15% vs last month</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">Direction Requests</Label>
                      <Navigation className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-2xl font-bold mb-1">892</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      <span>+8% vs last month</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overall Health Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Overall Health Score
                </CardTitle>
                <CardDescription>Comprehensive health score based on all metrics above</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-6 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Overall Health Score</h3>
                      <p className="text-sm text-muted-foreground">Based on all metrics above</p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-primary">87</div>
                      <p className="text-xs text-muted-foreground">Out of 100</p>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 mb-2">
                    <div className="bg-primary h-3 rounded-full" style={{ width: "87%" }}></div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-muted-foreground">Excellent health status</span>
                    <Badge variant="default" className="bg-green-600 ml-auto">Top 15%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Competitor Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Competitor Comparison
                </CardTitle>
                <CardDescription>Top 10 competitors ranked by GMB performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="min-w-full">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-2 pb-3 mb-3 border-b font-semibold text-xs text-muted-foreground">
                      <div className="col-span-1 text-center">Rank</div>
                      <div className="col-span-4">Business Name</div>
                      <div className="col-span-2 text-center">Rating</div>
                      <div className="col-span-2 text-center">Reviews</div>
                      <div className="col-span-2 text-center">Visibility</div>
                      <div className="col-span-1 text-center">Gap</div>
                    </div>

                    {/* Competitor Rows */}
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {/* Rank #1 */}
                      <div className="grid grid-cols-12 gap-2 items-center py-2 px-3 rounded-lg bg-green-50/50 border border-green-100 hover:bg-green-50 transition-colors">
                        <div className="col-span-1 text-center">
                          <Badge variant="default" className="bg-green-600">#1</Badge>
                        </div>
                        <div className="col-span-4 font-medium text-sm">Elite Coffee Co.</div>
                        <div className="col-span-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="font-semibold">4.9</span>
                          </div>
                        </div>
                        <div className="col-span-2 text-center font-semibold">512</div>
                        <div className="col-span-2 text-center font-semibold">92%</div>
                        <div className="col-span-1 text-center text-xs text-red-600">-267</div>
                      </div>

                      {/* Rank #2 */}
                      <div className="grid grid-cols-12 gap-2 items-center py-2 px-3 rounded-lg bg-blue-50/50 border border-blue-100 hover:bg-blue-50 transition-colors">
                        <div className="col-span-1 text-center">
                          <Badge variant="default" className="bg-blue-600">#2</Badge>
                        </div>
                        <div className="col-span-4 font-medium text-sm">Cafe Delight</div>
                        <div className="col-span-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="font-semibold">4.8</span>
                          </div>
                        </div>
                        <div className="col-span-2 text-center font-semibold">389</div>
                        <div className="col-span-2 text-center font-semibold">85%</div>
                        <div className="col-span-1 text-center text-xs text-red-600">-144</div>
                      </div>

                      {/* Rank #3 - Your Business */}
                      <div className="grid grid-cols-12 gap-2 items-center py-2 px-3 rounded-lg bg-primary/10 border-2 border-primary/30 hover:bg-primary/15 transition-colors">
                        <div className="col-span-1 text-center">
                          <Badge variant="default" className="bg-primary">#3</Badge>
                        </div>
                        <div className="col-span-4 font-medium text-sm flex items-center gap-2">
                          {business.name}
                          <Badge variant="secondary" className="text-xs">You</Badge>
                        </div>
                        <div className="col-span-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="font-semibold">4.7</span>
                          </div>
                        </div>
                        <div className="col-span-2 text-center font-semibold">245</div>
                        <div className="col-span-2 text-center font-semibold">78%</div>
                        <div className="col-span-1 text-center text-xs text-muted-foreground">—</div>
                      </div>

                      {/* Rank #4 */}
                      <div className="grid grid-cols-12 gap-2 items-center py-2 px-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors">
                        <div className="col-span-1 text-center">
                          <Badge variant="outline">#4</Badge>
                        </div>
                        <div className="col-span-4 font-medium text-sm">Morning Brew</div>
                        <div className="col-span-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="font-semibold">4.6</span>
                          </div>
                        </div>
                        <div className="col-span-2 text-center font-semibold">198</div>
                        <div className="col-span-2 text-center font-semibold">72%</div>
                        <div className="col-span-1 text-center text-xs text-green-600">+47</div>
                      </div>

                      {/* Rank #5 */}
                      <div className="grid grid-cols-12 gap-2 items-center py-2 px-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors">
                        <div className="col-span-1 text-center">
                          <Badge variant="outline">#5</Badge>
                        </div>
                        <div className="col-span-4 font-medium text-sm">Urban Bistro</div>
                        <div className="col-span-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="font-semibold">4.5</span>
                          </div>
                        </div>
                        <div className="col-span-2 text-center font-semibold">176</div>
                        <div className="col-span-2 text-center font-semibold">68%</div>
                        <div className="col-span-1 text-center text-xs text-green-600">+69</div>
                      </div>

                      {/* Rank #6 */}
                      <div className="grid grid-cols-12 gap-2 items-center py-2 px-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors">
                        <div className="col-span-1 text-center">
                          <Badge variant="outline">#6</Badge>
                        </div>
                        <div className="col-span-4 font-medium text-sm">The Corner Cafe</div>
                        <div className="col-span-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="font-semibold">4.4</span>
                          </div>
                        </div>
                        <div className="col-span-2 text-center font-semibold">142</div>
                        <div className="col-span-2 text-center font-semibold">65%</div>
                        <div className="col-span-1 text-center text-xs text-green-600">+103</div>
                      </div>

                      {/* Rank #7 */}
                      <div className="grid grid-cols-12 gap-2 items-center py-2 px-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors">
                        <div className="col-span-1 text-center">
                          <Badge variant="outline">#7</Badge>
                        </div>
                        <div className="col-span-4 font-medium text-sm">Brew Masters</div>
                        <div className="col-span-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="font-semibold">4.3</span>
                          </div>
                        </div>
                        <div className="col-span-2 text-center font-semibold">128</div>
                        <div className="col-span-2 text-center font-semibold">62%</div>
                        <div className="col-span-1 text-center text-xs text-green-600">+117</div>
                      </div>

                      {/* Rank #8 */}
                      <div className="grid grid-cols-12 gap-2 items-center py-2 px-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors">
                        <div className="col-span-1 text-center">
                          <Badge variant="outline">#8</Badge>
                        </div>
                        <div className="col-span-4 font-medium text-sm">Coffee Express</div>
                        <div className="col-span-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="font-semibold">4.2</span>
                          </div>
                        </div>
                        <div className="col-span-2 text-center font-semibold">98</div>
                        <div className="col-span-2 text-center font-semibold">58%</div>
                        <div className="col-span-1 text-center text-xs text-green-600">+147</div>
                      </div>

                      {/* Rank #9 */}
                      <div className="grid grid-cols-12 gap-2 items-center py-2 px-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors">
                        <div className="col-span-1 text-center">
                          <Badge variant="outline">#9</Badge>
                        </div>
                        <div className="col-span-4 font-medium text-sm">Java Junction</div>
                        <div className="col-span-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="font-semibold">4.1</span>
                          </div>
                        </div>
                        <div className="col-span-2 text-center font-semibold">87</div>
                        <div className="col-span-2 text-center font-semibold">55%</div>
                        <div className="col-span-1 text-center text-xs text-green-600">+158</div>
                      </div>

                      {/* Rank #10 */}
                      <div className="grid grid-cols-12 gap-2 items-center py-2 px-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors">
                        <div className="col-span-1 text-center">
                          <Badge variant="outline">#10</Badge>
                        </div>
                        <div className="col-span-4 font-medium text-sm">Daily Grind</div>
                        <div className="col-span-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="font-semibold">4.0</span>
                          </div>
                        </div>
                        <div className="col-span-2 text-center font-semibold">76</div>
                        <div className="col-span-2 text-center font-semibold">52%</div>
                        <div className="col-span-1 text-center text-xs text-green-600">+169</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ranking Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Ranking Insights
                </CardTitle>
                <CardDescription>Key insights to improve your ranking position</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground mb-1">To reach #2</div>
                    <div className="font-semibold">Need 144 more reviews</div>
                    <div className="text-xs text-muted-foreground mt-1">+7% visibility improvement</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground mb-1">To reach #1</div>
                    <div className="font-semibold">Need 267 more reviews</div>
                    <div className="text-xs text-muted-foreground mt-1">+14% visibility improvement</div>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="text-xs text-muted-foreground mb-1">Your advantage</div>
                    <div className="font-semibold">47+ reviews ahead of #4</div>
                    <div className="text-xs text-muted-foreground mt-1">6% better visibility</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Keywords Tab */}
          <TabsContent value="keywords" className="space-y-6 mt-0">
            <KeywordsTab
              business={business}
              newKeyword={newKeyword}
              setNewKeyword={setNewKeyword}
              handleAddKeyword={handleAddKeyword}
              handleRemoveKeyword={handleRemoveKeyword}
              handleUpdateBusiness={handleUpdateBusiness}
              sendKeywordsToAPI={sendKeywordsToAPI}
              handleSaveChanges={handleSaveChanges}
              suggestedKeywords={suggestedKeywords}
              suggestionsLimit={suggestionsLimit}
              setSuggestionsLimit={setSuggestionsLimit}
              displayedSuggestions={displayedSuggestions}
            />
          </TabsContent>

          {/* Links & QR Tab */}
          <TabsContent value="links" className="space-y-6 mt-0">
            {qrCodeDataUrl && (
              <Card>
                <CardHeader>
                  <CardTitle>QR Code</CardTitle>
                  <CardDescription>Dynamic QR code for your business review page</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-center p-8 border rounded-lg bg-white">
                      <img
                        src={qrCodeDataUrl}
                        alt="QR Code"
                        className="max-w-[200px] h-auto"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleDownloadQR}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download PNG
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      This QR code links to your unique review page. Scan it to leave a review.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Business Links</CardTitle>
                <CardDescription>Manage your business links and URLs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Review URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={reviewUrl}
                      readOnly
                      className="bg-muted"
                      placeholder="Generating review URL..."
                    />
                    {reviewUrl && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(reviewUrl)}
                          title="Copy link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => window.open(reviewUrl, "_blank")}
                          title="Open link"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This is your unique review URL. Share it with customers or use the QR code above.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Google Business Review Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={business.googleBusinessReviewLink || ""}
                      onChange={(e) => handleUpdateBusiness({ googleBusinessReviewLink: e.target.value })}
                      placeholder="https://g.page/r/your-business/review"
                    />
                    {business.googleBusinessReviewLink && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(business.googleBusinessReviewLink!)}
                          title="Copy link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => window.open(business.googleBusinessReviewLink, "_blank")}
                          title="Open link"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    After customers submit feedback, they will be redirected to this Google Business review page.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Social Media Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={business.socialMediaLink || ""}
                      onChange={(e) => handleUpdateBusiness({ socialMediaLink: e.target.value })}
                      placeholder="https://facebook.com/your-business or https://instagram.com/your-business"
                    />
                    {business.socialMediaLink && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(business.socialMediaLink!)}
                          title="Copy link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => window.open(business.socialMediaLink, "_blank")}
                          title="Open link"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Optional: Add your social media profile link (Facebook, Instagram, Twitter, etc.)
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => handleSaveChanges("Business links")}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Auto Reply Tab */}
          <TabsContent value="auto-reply" className="space-y-6 mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Automatic Replies</CardTitle>
                <CardDescription>
                  Configure automatic responses to customer feedback
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Label>Enable Auto Replies</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically respond to customer feedback based on their rating
                    </p>
                  </div>
                  <Switch
                    checked={business.autoReplyEnabled}
                    onCheckedChange={(checked) => handleUpdateBusiness({ autoReplyEnabled: checked })}
                  />
                </div>

                {business.autoReplyEnabled && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Excellent Rating Response</Label>
                        <Textarea
                          placeholder="Thank you for your excellent feedback! We're thrilled to hear about your positive experience..."
                          className="min-h-[100px]"
                        />
                        <p className="text-xs text-muted-foreground">
                          This message will be sent when customers rate their experience as "Excellent"
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Good Rating Response</Label>
                        <Textarea
                          placeholder="Thank you for your feedback! We appreciate you taking the time to share your experience..."
                          className="min-h-[100px]"
                        />
                        <p className="text-xs text-muted-foreground">
                          This message will be sent when customers rate their experience as "Good"
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Average Rating Response</Label>
                        <Textarea
                          placeholder="Thank you for your feedback. We value your input and are always working to improve our service..."
                          className="min-h-[100px]"
                        />
                        <p className="text-xs text-muted-foreground">
                          This message will be sent when customers rate their experience as "Average"
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Need Improvement Rating Response</Label>
                        <Textarea
                          placeholder="We're sorry to hear about your experience. We'd like to make things right. Please contact us at..."
                          className="min-h-[100px]"
                        />
                        <p className="text-xs text-muted-foreground">
                          This message will be sent when customers rate their experience as "Need Improvement"
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="flex justify-end">
                  <Button
                    onClick={() => handleSaveChanges("Auto-reply settings")}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6 mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Customer Manual Reviews
                </CardTitle>
                <CardDescription>
                  Reviews from customers who selected "Need Improvement" rating
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingReviews ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 mx-auto mb-4 text-muted-foreground animate-spin" />
                    <p className="text-muted-foreground">Loading reviews...</p>
                  </div>
                ) : filteredReviews.length === 0 && allReviews.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No manual reviews yet</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Reviews from customers who selected "Need Improvement" will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Filter Buttons */}
                      {/* {allReviews.length > 0 && (
                        <div className="flex flex-wrap gap-2 pb-4 border-b">
                          {reviewFilters.map((filter) => {
                            const count = allReviews.filter((r) => r.category === filter.id).length;
                            return (
                              <Button
                                key={filter.id}
                                variant={selectedReviewFilter === filter.id ? "default" : "outline"}
                                onClick={() => setSelectedReviewFilter(selectedReviewFilter === filter.id ? null : filter.id)}
                                className={
                                  selectedReviewFilter === filter.id
                                    ? "bg-[#9747FF] text-white border-[#9747FF] hover:bg-[#9747FF]/90 rounded-full px-4 py-2"
                                    : "bg-white border-[#9747FF] text-[#9747FF] hover:bg-white/90 rounded-full px-4 py-2"
                                }
                                disabled={count === 0}
                              >
                                {filter.label} {count > 0 && `(${count})`}
                              </Button>
                            );
                          })}
                        </div>
                      )} */}

                      {/* No results message when filter is active */}
                      {/* {selectedReviewFilter && filteredReviews.length === 0 && allReviews.length > 0 && (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">
                            No reviews found for this filter. Try selecting a different category.
                          </p>
                        </div>
                      )} */}

                      {/* Reviews List */}
                      {filteredReviews.length > 0 && (
                        <div className="space-y-4">
                          {filteredReviews.map((review) => (
                        <Card key={review.id} className="border-l-4 border-l-orange-500">
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  {review.feedback && (
                                    <p className="text-sm text-foreground leading-relaxed mb-3">
                                      {review.feedback}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Separator />
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                                {review.customerName && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <User className="h-4 w-4" />
                                    <span>{review.customerName}</span>
                                  </div>
                                )}
                                {review.customerEmail && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="h-4 w-4" />
                                    <span>{review.customerEmail}</span>
                                  </div>
                                )}
                                {review.customerPhone && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone className="h-4 w-4" />
                                    <span>{review.customerPhone}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {new Date(review.createdAt).toLocaleDateString("en-IN", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Tab */}
          {/* Auto QR Impact Tab */}
          <TabsContent value="auto-qr-impact" className="space-y-6 mt-0">
            {/* Hero Stats */}
            <Card className="border-primary/20 bg-gradient-to-br from-purple-50/50 to-pink-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Performance Overview
                </CardTitle>
                <CardDescription>Key metrics from your Auto QR implementation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-5 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50 hover:border-gray-300/50 transition-all duration-200">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                        <Star className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 mb-1.5">Total Reviews Generated</p>
                        <p className="text-2xl font-semibold text-gray-900 mb-0.5">{allReviews.length}</p>
                        <p className="text-xs text-gray-400">via Auto QR</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50 hover:border-gray-300/50 transition-all duration-200">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Award className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 mb-1.5">Average Rating</p>
                        <p className="text-2xl font-semibold text-gray-900 mb-0.5">
                          {allReviews.length > 0
                            ? (allReviews.reduce((sum, r) => sum + ratingToNumber(r.rating), 0) / allReviews.length).toFixed(1)
                            : "0.0"}
                        </p>
                        <p className="text-xs text-gray-400">out of 5.0</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50 hover:border-gray-300/50 transition-all duration-200">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 mb-1.5">Response Rate</p>
                        <p className="text-2xl font-semibold text-gray-900 mb-0.5">
                          {allReviews.length > 0
                            ? Math.round((allReviews.filter(r => r.status === "responded").length / allReviews.length) * 100)
                            : 0}%
                        </p>
                        <p className="text-xs text-gray-400">reviews replied</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50 hover:border-gray-300/50 transition-all duration-200">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 mb-1.5">SEO Boost</p>
                        <p className="text-2xl font-semibold text-gray-900 mb-0.5">
                          {allReviews.length > 0
                            ? Math.min(Math.round((allReviews.length * 0.15) + (allReviews.filter(r => ratingToNumber(r.rating) >= 4).length * 0.1)), 100)
                            : 0}%
                        </p>
                        <p className="text-xs text-gray-400">search visibility</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50 hover:border-gray-300/50 transition-all duration-200">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0">
                        <Activity className="h-5 w-5 text-pink-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 mb-1.5">Review Velocity</p>
                        <p className="text-2xl font-semibold text-gray-900 mb-0.5">
                          {(() => {
                            if (allReviews.length === 0) return 0;
                            try {
                              const reviewDates = allReviews.map(r => new Date(r.createdAt).getTime()).filter(d => !isNaN(d));
                              if (reviewDates.length === 0) return allReviews.length;
                              const oldestDate = Math.min(...reviewDates);
                              const daysDiff = Math.max(1, Math.ceil((new Date().getTime() - oldestDate) / (1000 * 60 * 60 * 24)));
                              const months = Math.max(1, Math.ceil(daysDiff / 30));
                              return Math.round(allReviews.length / months);
                            } catch {
                              return allReviews.length;
                            }
                          })()}
                        </p>
                        <p className="text-xs text-gray-400">reviews per month</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50 hover:border-gray-300/50 transition-all duration-200">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <Repeat className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 mb-1.5">Avg Reviews Increase</p>
                        <p className="text-2xl font-semibold text-gray-900 mb-0.5">
                          {allReviews.length > 0
                            ? `+${Math.round((allReviews.filter(r => r.feedback && r.feedback.trim().length > 0).length / allReviews.length) * 35)}%`
                            : "+0%"}
                        </p>
                        <p className="text-xs text-gray-400">with detailed feedback</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Impact Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Your Auto QR Impact Story
                </CardTitle>
                <CardDescription>See how tribly.ai is transforming your business reputation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground">
                    Since implementing Auto QR by tribly.ai, your business has seen measurable improvements
                    in customer engagement and online reputation management.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Positive Growth Metrics
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm">Increased Review Volume</p>
                            <p className="text-xs text-muted-foreground">
                              {allReviews.length} reviews collected through QR codes
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Faster Customer Feedback</p>
                          <p className="text-xs text-muted-foreground">
                            QR codes provide instant access to review forms
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Better Online Visibility</p>
                          <p className="text-xs text-muted-foreground">
                            More reviews boost your search rankings
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Enhanced Trust</p>
                          <p className="text-xs text-muted-foreground">
                            Authentic reviews build customer confidence
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-600" />
                      Time & Cost Savings
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Automated Review Collection</p>
                          <p className="text-xs text-muted-foreground">
                            No manual effort needed to gather feedback
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Bot className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Smart Auto-Replies</p>
                          <p className="text-xs text-muted-foreground">
                            AI-powered responses save hours of work
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Target className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Focused Improvements</p>
                          <p className="text-xs text-muted-foreground">
                            Data-driven insights guide business decisions
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Reputation Protection</p>
                          <p className="text-xs text-muted-foreground">
                            Quick responses prevent reputation damage
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Call to Action */}
            <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
              <CardContent className="py-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Keep Growing with tribly.ai</h3>
                    <p className="text-sm text-muted-foreground">
                      Continue leveraging Auto QR to build a stronger online presence
                    </p>
                  </div>
                  <Button className="gap-2">
                    <Download className="h-4 w-4" />
                    Download Impact Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment" className="space-y-6 mt-0">
            {/* Plan Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* QR-Plus Plan */}
              <Card className={`relative ${business.paymentPlan === "qr-plus" ? "ring-2 ring-primary" : ""}`}>
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
                    {business.paymentPlan === "qr-plus" && (
                      <Badge variant="default" className="text-xs">
                        Current Plan
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
                  {business.paymentPlan !== "qr-plus" && (
                    <Button
                      className="w-full"
                      onClick={() => handleUpdateBusiness({ paymentPlan: "qr-plus" })}
                    >
                      Upgrade to QR-Plus
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* QR-Basic Plan */}
              <Card className={`relative ${business.paymentPlan === "qr-basic" ? "ring-2 ring-primary" : ""}`}>
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
                    {business.paymentPlan === "qr-basic" && (
                      <Badge variant="default" className="text-xs">
                        Current Plan
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
                  {business.paymentPlan !== "qr-basic" && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => handleUpdateBusiness({ paymentPlan: "qr-basic" })}
                    >
                      Switch to QR-Basic
                    </Button>
                  )}
                </CardContent>
              </Card>
                </div>

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
                        {business.paymentExpiryDate
                          ? new Date(business.paymentExpiryDate).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "Not set"}
                      </span>
                    </div>
                    {business.paymentExpiryDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(business.paymentExpiryDate) > new Date()
                          ? `${Math.ceil((new Date(business.paymentExpiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining`
                          : "Expired"}
                      </p>
                    )}
                    </div>
                  <Button
                    size="lg"
                    className="gap-2"
                    onClick={() => {
                      // Check if payment is already active and not expired
                      if (business.paymentStatus === "active" && business.paymentExpiryDate) {
                        const expiryDate = new Date(business.paymentExpiryDate);
                        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        if (expiryDate > new Date() && daysUntilExpiry > 60) {
                          setToastMessage(`Your subscription is active. Payment can be renewed ${daysUntilExpiry - 60} days before expiry (when ${daysUntilExpiry} days or less remain).`);
                          setShowToast(true);
                          return;
                        }
                      }
                      setShowPaymentDialog(true);
                    }}
                    disabled={
                      !business.paymentPlan ||
                      !!(business.paymentStatus === "active" &&
                       business.paymentExpiryDate &&
                       (() => {
                         const expiryDate = new Date(business.paymentExpiryDate);
                         const daysUntilExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                         return expiryDate > new Date() && daysUntilExpiry > 60;
                       })())
                    }
                  >
                    <CreditCard className="h-5 w-5" />
                    Complete Payment
                  </Button>
                          </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Management Tab - Only visible for admin */}
          {currentUser && (currentUser.role === "admin" || currentUser.userType === "admin") && (
            <TabsContent value="team-management" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Management
                  </CardTitle>
                  <CardDescription>
                    Create and manage users for this business account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add User Form */}
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <h3 className="font-semibold text-lg">Add New User</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="user-name">Name</Label>
                        <Input
                          id="user-name"
                          type="text"
                          placeholder="John Doe"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="user-email">Email</Label>
                        <Input
                          id="user-email"
                          type="email"
                          placeholder="user@example.com"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="user-password">Password</Label>
                        <Input
                          id="user-password"
                          type="password"
                          placeholder="Enter password"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={async () => {
                        if (!newUserEmail || !newUserPassword) {
                          setToastMessage("Please fill in both email and password");
                          setShowToast(true);
                          return;
                        }

                        setIsAddingUser(true);
                        try {
                          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.tribly.ai";
                          const authToken = getAuthToken();

                          const headers: HeadersInit = {
                            "Content-Type": "application/json",
                          };

                          if (authToken) {
                            headers["Authorization"] = `Bearer ${authToken}`;
                          }

                          const response = await fetch(
                            `${apiBaseUrl}/dashboard/v1/business_qr/business_team`,
                            {
                              method: "POST",
                              headers,
                              body: JSON.stringify({
                                qr_id: businessSlug,
                                name: newUserName || undefined,
                                email: newUserEmail,
                                password: newUserPassword,
                              }),
                            }
                          );

                          if (!response.ok) {
                            const errorData = await response.json().catch(() => ({}));
                            throw new Error(errorData.message || "Failed to create user");
                          }

                          const data = await response.json();
                          if (data.status === "success") {
                            setToastMessage("User created successfully");
                            setShowToast(true);
                            setNewUserName("");
                            setNewUserEmail("");
                            setNewUserPassword("");
                            // Refresh team users list
                            fetchTeamUsers();
                          } else {
                            throw new Error(data.message || "Failed to create user");
                          }
                        } catch (error) {
                          console.error("Error creating user:", error);
                          setToastMessage(
                            error instanceof Error ? error.message : "Failed to create user"
                          );
                          setShowToast(true);
                        } finally {
                          setIsAddingUser(false);
                        }
                      }}
                      disabled={isAddingUser || !newUserEmail || !newUserPassword}
                      className="w-full md:w-auto"
                    >
                      {isAddingUser ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Add User
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Team Users List */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">Team Users ({teamUsers.length})</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchTeamUsers}
                        disabled={isLoadingTeamUsers}
                      >
                        {isLoadingTeamUsers ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Repeat className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {isLoadingTeamUsers ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p>Loading team users...</p>
                      </div>
                    ) : teamUsers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No team users found</p>
                        <p className="text-sm">Add a user to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {teamUsers.map((user, index) => (
                          <div
                            key={user.id || user.email || `user-${index}`}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{user.name || user.email}</p>
                                <p className="text-sm text-muted-foreground">
                                  {user.name && user.email !== user.name && (
                                    <>
                                      {user.email} •{" "}
                                    </>
                                  )}
                                  Added {new Date(user.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingUser(user);
                                  setUpdateUserName(user.name || "");
                                  setUpdateUserEmail(user.email);
                                  setUpdateUserPassword("");
                                  setShowUpdateDialog(true);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
          </div>
        </Tabs>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />

      {/* Payment QR Dialog */}
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
            {business?.paymentPlan && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {business.paymentPlan === "qr-plus" ? (
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
                      ₹{business.paymentPlan === "qr-plus" ? "6,999" : "2,999"}
                    </div>
                    <div className="text-xs text-muted-foreground">per year</div>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Business:</span>
                  <span className="font-medium">{business.name}</span>
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
                    Your subscription has been activated. You will be redirected shortly.
                  </p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Plan expires:</span>
                    <span className="font-medium">
                      {business?.paymentExpiryDate
                        ? new Date(business.paymentExpiryDate).toLocaleDateString("en-IN", {
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
                  <h3 className="text-lg font-semibold">Payment Session Expired</h3>
                  <p className="text-sm text-muted-foreground">
                    The payment session has expired. Please start a new payment.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setPaymentStatus("pending");
                    setPaymentQRCode(null);
                    setPaymentTimer(900);
                  }}
                  className="w-full"
                >
                  Start New Payment
                </Button>
              </div>
            )}

            {/* Error handling for edge cases */}
            {!business?.paymentPlan && (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertCircle className="h-10 w-10 text-yellow-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">No Plan Selected</h3>
                  <p className="text-sm text-muted-foreground">
                    Please select a plan before proceeding with payment.
                  </p>
                </div>
                <Button
                  onClick={() => setShowPaymentDialog(false)}
                  variant="outline"
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Update User Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Team User</DialogTitle>
            <DialogDescription>
              Update user details for {editingUser?.name || editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="update-user-name">Name</Label>
              <Input
                id="update-user-name"
                type="text"
                placeholder="John Doe"
                value={updateUserName}
                onChange={(e) => setUpdateUserName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="update-user-email">Email</Label>
              <Input
                id="update-user-email"
                type="email"
                placeholder="user@example.com"
                value={updateUserEmail}
                onChange={(e) => setUpdateUserEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="update-user-password">Password</Label>
              <Input
                id="update-user-password"
                type="password"
                placeholder="Leave blank to keep current password"
                value={updateUserPassword}
                onChange={(e) => setUpdateUserPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave password blank if you don't want to change it
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUpdateDialog(false);
                  setEditingUser(null);
                  setUpdateUserName("");
                  setUpdateUserEmail("");
                  setUpdateUserPassword("");
                }}
                disabled={isUpdatingUser}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!editingUser) return;

                  if (!updateUserEmail) {
                    setToastMessage("Email is required");
                    setShowToast(true);
                    return;
                  }

                  setIsUpdatingUser(true);
                  try {
                    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.tribly.ai";
                    const authToken = getAuthToken();

                    const headers: HeadersInit = {
                      "Content-Type": "application/json",
                    };

                    if (authToken) {
                      headers["Authorization"] = `Bearer ${authToken}`;
                    }

                    // Build payload - only include fields that have changed
                    const payload: {
                      qr_id: string;
                      user_id?: string;
                      email: string;
                      name?: string;
                      password?: string;
                    } = {
                      qr_id: businessSlug,
                      email: updateUserEmail,
                    };

                    // Include user_id if available (to identify which user to update)
                    if (editingUser.id) {
                      payload.user_id = editingUser.id;
                    }

                    // Include name if provided
                    if (updateUserName) {
                      payload.name = updateUserName;
                    }

                    // Include password only if provided (not empty)
                    if (updateUserPassword && updateUserPassword.trim() !== "") {
                      payload.password = updateUserPassword;
                    }

                    const response = await fetch(
                      `${apiBaseUrl}/dashboard/v1/business_qr/business_team`,
                      {
                        method: "PATCH",
                        headers,
                        body: JSON.stringify(payload),
                      }
                    );

                    if (!response.ok) {
                      const errorData = await response.json().catch(() => ({}));
                      throw new Error(errorData.message || "Failed to update user");
                    }

                    const data = await response.json();
                    if (data.status === "success") {
                      setToastMessage("User updated successfully");
                      setShowToast(true);
                      setShowUpdateDialog(false);
                      setEditingUser(null);
                      setUpdateUserName("");
                      setUpdateUserEmail("");
                      setUpdateUserPassword("");
                      // Refresh team users list
                      fetchTeamUsers();
                    } else {
                      throw new Error(data.message || "Failed to update user");
                    }
                  } catch (error) {
                    console.error("Error updating user:", error);
                    setToastMessage(
                      error instanceof Error ? error.message : "Failed to update user"
                    );
                    setShowToast(true);
                  } finally {
                    setIsUpdatingUser(false);
                  }
                }}
                disabled={isUpdatingUser || !updateUserEmail}
              >
                {isUpdatingUser ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update User"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
