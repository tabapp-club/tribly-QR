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
import { Business, BusinessCategory, ReviewCategory } from "@/lib/types";
import { generateShortUrlCode, generateReviewUrl, generateQRCodeDataUrl, downloadQRCodeAsPNG } from "@/lib/qr-utils";
import { getBusinessBySlug } from "@/lib/business-slug";
import { getStoredUser, logout, setStoredUser } from "@/lib/auth";
import { Toast } from "@/components/ui/toast";
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
  const [suggestionsLimit, setSuggestionsLimit] = useState(12);
  const [isBusinessOwner, setIsBusinessOwner] = useState(false);
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getStoredUser>>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "failed" | "expired">("pending");
  const [paymentQRCode, setPaymentQRCode] = useState<string | null>(null);
  const [paymentTimer, setPaymentTimer] = useState(900); // 15 minutes in seconds
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Try to find business by slug first, fallback to ID for backward compatibility
    let businessData = getBusinessBySlug(businessSlug, mockBusinesses);
    
    // If not found by slug, try as ID (for backward compatibility)
    if (!businessData) {
      businessData = mockBusinesses.find(b => b.id === businessSlug) || undefined;
    }
    
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

  // Generate payment QR code when dialog opens
  useEffect(() => {
    if (showPaymentDialog && business && !paymentQRCode) {
      const generatePaymentQR = async () => {
        try {
          const planPrice = business.paymentPlan === "qr-plus" ? "5999" : "2499";
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

  // Get all reviews for the business
  const allReviews = useMemo(() => {
    if (!business) return [];
    return getReviewsByBusinessId(business.id);
  }, [business]);

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
      // In a real app, this would make an API call
      console.log("Updating business:", updates);
    }
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim() && business) {
      const trimmedKeyword = newKeyword.trim();
      const currentKeywords = business.keywords || [];
      
      // Check if keyword already exists (case-insensitive)
      if (currentKeywords.some(k => k.toLowerCase() === trimmedKeyword.toLowerCase())) {
        setToastMessage("Keyword already exists");
        setShowToast(true);
        return;
      }
      
      handleUpdateBusiness({
        keywords: [...currentKeywords, trimmedKeyword]
      });
      setNewKeyword("");
    }
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    if (business && business.keywords) {
      handleUpdateBusiness({
        keywords: business.keywords.filter(k => k !== keywordToRemove)
      });
    }
  };

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

  const handleSaveChanges = (section: string) => {
    // In a real app, this would make an API call to save changes
    console.log(`Saving ${section}...`);
    
    // Show success toast
    setToastMessage(`${section} saved successfully!`);
    setShowToast(true);
    
    // Optional: Navigate back to dashboard after a delay
    // setTimeout(() => {
    //   router.push("/dashboard");
    // }, 2000);
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You can add a toast notification here
  };

  const handleDownloadQR = () => {
    if (qrCodeDataUrl && business) {
      const filename = `${business.name.replace(/\s+/g, "-").toLowerCase()}-qr-code.png`;
      downloadQRCodeAsPNG(qrCodeDataUrl, filename);
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
            <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
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
          {!isBusinessOwner && (
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
            {isBusinessOwner && (
              <Button
                variant="outline"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-8 bg-white/80 backdrop-blur-sm border border-purple-100 p-1 rounded-lg shadow-sm">
            <TabsTrigger 
              value="overview"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="gmb-health"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
            >
              GMB Health
            </TabsTrigger>
            <TabsTrigger 
              value="keywords"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
            >
              Keywords
            </TabsTrigger>
            <TabsTrigger 
              value="links"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
            >
              Links & QR
            </TabsTrigger>
            <TabsTrigger 
              value="auto-reply"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
            >
              Auto Reply
            </TabsTrigger>
            <TabsTrigger 
              value="reports"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
            >
              Reports
            </TabsTrigger>
            <TabsTrigger 
              value="reviews"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
            >
              Reviews
            </TabsTrigger>
            <TabsTrigger 
              value="payment"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
            >
              Payment
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>Basic business details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Business Overview</Label>
                  <Textarea
                    value={business.overview || ""}
                    onChange={(e) => handleUpdateBusiness({ overview: e.target.value })}
                    placeholder="Enter a brief description of your business, services, and what makes you unique..."
                    className="min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide a comprehensive overview of your business to help customers understand what you offer.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Business Name</Label>
                    <Input
                      value={business.name}
                      onChange={(e) => handleUpdateBusiness({ name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={business.email}
                      onChange={(e) => handleUpdateBusiness({ email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={business.phone || ""}
                      onChange={(e) => handleUpdateBusiness({ phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={business.category}
                      onValueChange={(value) => handleUpdateBusiness({ category: value as BusinessCategory })}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>Address</Label>
                    <Input
                      value={business.address || ""}
                      onChange={(e) => handleUpdateBusiness({ address: e.target.value })}
                      placeholder="123 Main St, City, State 12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={business.city || ""}
                      onChange={(e) => handleUpdateBusiness({ city: e.target.value })}
                      placeholder="Mumbai"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Area</Label>
                    <Input
                      value={business.area || ""}
                      onChange={(e) => handleUpdateBusiness({ area: e.target.value })}
                      placeholder="Bandra"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleSaveChanges("Business information")}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GMB Health Tab */}
          <TabsContent value="gmb-health" className="space-y-6">
            {/* Current Ranking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Current GMB Ranking
                </CardTitle>
                <CardDescription>Your Google My Business performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">Overall Ranking</Label>
                      <Award className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-3xl font-bold mb-1">#3</div>
                    <p className="text-xs text-muted-foreground">Out of 12 competitors</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      <span>Up 2 positions this month</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">Average Rating</Label>
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    </div>
                    <div className="text-3xl font-bold mb-1">4.7</div>
                    <p className="text-xs text-muted-foreground">Based on 245 reviews</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      <span>+0.2 from last month</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-muted-foreground">Search Visibility</Label>
                      <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-3xl font-bold mb-1">78%</div>
                    <p className="text-xs text-muted-foreground">Local search impressions</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      <span>+5% from last month</span>
                    </div>
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

                {/* Summary Insights */}
                <div className="mt-4 pt-4 border-t">
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Keywords Tab */}
          <TabsContent value="keywords" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  SEO Keywords
                </CardTitle>
                <CardDescription>
                  Add keywords to boost your business page SEO and improve search visibility
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {business?.keywords && business.keywords.length > 0 ? (
                    <div className="space-y-3">
                      <Label>Current Keywords ({business.keywords.length})</Label>
                      <div className="flex flex-wrap gap-2">
                        {business.keywords.map((keyword, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="flex items-center gap-2 px-3 py-1.5 text-sm"
                          >
                            <Hash className="h-3 w-3" />
                            {keyword}
                            <button
                              onClick={() => handleRemoveKeyword(keyword)}
                              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                              aria-label={`Remove ${keyword}`}
                            >
                              <XIcon className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Hash className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No keywords added yet</p>
                      <p className="text-sm mt-2">Add keywords to improve your SEO</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter a keyword (e.g., coffee shop, restaurant, best cafe)"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddKeyword();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button onClick={handleAddKeyword} disabled={!newKeyword.trim()}>
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Keyword
                    </Button>
                  </div>

                  {/* Suggested Keywords */}
                  {suggestedKeywords.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Suggested Keywords</Label>
                        {suggestedKeywords.length > suggestionsLimit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSuggestionsLimit(prev => prev + 12)}
                            className="text-xs text-primary hover:text-primary/80"
                          >
                            Suggest more
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {displayedSuggestions.map((keyword, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors px-3 py-1.5"
                            onClick={() => {
                              setNewKeyword(keyword);
                              // Auto-add on click
                              const trimmedKeyword = keyword.trim();
                              if (business) {
                                const currentKeywords = business.keywords || [];
                                if (!currentKeywords.some(k => k.toLowerCase() === trimmedKeyword.toLowerCase())) {
                                  handleUpdateBusiness({
                                    keywords: [...currentKeywords, trimmedKeyword]
                                  });
                                }
                              }
                            }}
                          >
                            <Hash className="h-3 w-3 mr-1" />
                            {keyword}
                            <PlusIcon className="h-3 w-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Click on any suggested keyword to add it instantly
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => handleSaveChanges("Keywords")}
                      className="gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Save Keywords
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Links & QR Tab */}
          <TabsContent value="links" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>QR Code</CardTitle>
                <CardDescription>Dynamic QR code for your business review page</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {qrCodeDataUrl ? (
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
                ) : (
                  <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg">
                    <div className="text-center">
                      <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Generating QR code...</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

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
          <TabsContent value="auto-reply" className="space-y-6">
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
                        <Label>Not Expected Rating Response</Label>
                        <Textarea
                          placeholder="We're sorry to hear about your experience. We'd like to make things right. Please contact us at..."
                          className="min-h-[100px]"
                        />
                        <p className="text-xs text-muted-foreground">
                          This message will be sent when customers rate their experience as "Not Expected"
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

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Reports & Analytics</CardTitle>
                    <CardDescription>View and download business reports</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select defaultValue="weekly">
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">This Week</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">42</div>
                      <p className="text-xs text-muted-foreground">New reviews</p>
                      <p className="text-xs text-green-600 mt-1">+12% from last week</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">4.7</div>
                      <p className="text-xs text-muted-foreground">Out of 5.0</p>
                      <p className="text-xs text-green-600 mt-1">+0.2 from last week</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">94%</div>
                      <p className="text-xs text-muted-foreground">Auto-replies sent</p>
                      <p className="text-xs text-green-600 mt-1">+3% from last week</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Customer Manual Reviews
                </CardTitle>
                <CardDescription>
                  Reviews from customers who selected "Not Expected" rating
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredReviews.length === 0 && allReviews.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No manual reviews yet</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Reviews from customers who selected "Not Expected" will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Filter Buttons */}
                      {allReviews.length > 0 && (
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
                      )}

                      {/* No results message when filter is active */}
                      {selectedReviewFilter && filteredReviews.length === 0 && allReviews.length > 0 && (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">
                            No reviews found for this filter. Try selecting a different category.
                          </p>
                        </div>
                      )}

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
          <TabsContent value="payment" className="space-y-6">
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
                          <span className="text-2xl font-bold">₹5,999</span>
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
                          <span className="text-2xl font-bold">₹2,499</span>
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
                      (business.paymentStatus === "active" && 
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
                      ₹{business.paymentPlan === "qr-plus" ? "5,999" : "2,499"}
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
    </div>
  );
}

