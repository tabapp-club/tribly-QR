"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { addBusiness } from "@/lib/mock-data";
import { BusinessStatus, BusinessCategory, UserRole } from "@/lib/types";
import { logout, setStoredUser, getStoredUser } from "@/lib/auth";
import { generateQRCodeDataUrl } from "@/lib/qr-utils";
import {
  LogOut,
  ChevronDown,
  CheckCircle2,
  Crown,
  Shield,
  Check,
  Star,
  CreditCard,
  Calendar,
  XCircle,
  Clock,
  Loader2
} from "lucide-react";

export default function SalesDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(getStoredUser());

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
      const updatedUser = {
        ...currentUser,
        role: "sales-team" as UserRole,
      };
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
  });

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "failed" | "expired">("pending");
  const [paymentQRCode, setPaymentQRCode] = useState<string | null>(null);
  const [paymentTimer, setPaymentTimer] = useState(900); // 15 minutes in seconds
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);


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
          const planPrice = newBusiness.paymentPlan === "qr-plus" ? "5999" : "2499";
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

  const handleOnboardBusiness = () => {
    if (!user) return;

    // Create business with salesTeamId
    const businessData = {
      ...newBusiness,
      category: (newBusiness.category || "other") as BusinessCategory,
      paymentPlan: (newBusiness.paymentPlan || undefined) as "qr-basic" | "qr-plus" | undefined,
      salesTeamId: user.id,
      feedbackTone: "professional" as const,
      autoReplyEnabled: false,
    };

    addBusiness(businessData);

    // Reset form
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
    });

    // Show success message (you can add a toast notification here)
    alert("Business onboarded successfully!");
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

        {/* Onboarding Form */}
        <div className="grid gap-6 mt-8">
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
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the official business name as it appears on legal documents
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">
                    Business Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={newBusiness.category}
                    onValueChange={(value) => setNewBusiness({ ...newBusiness, category: value as BusinessCategory })}
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
                  <p className="text-xs text-muted-foreground">
                    Select the primary category that best describes the business
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
                      className={`relative cursor-pointer transition-all hover:shadow-md ${
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
                                <span className="text-2xl font-bold">₹5,999</span>
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
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* QR-Basic Plan */}
                    <Card
                      className={`relative cursor-pointer transition-all hover:shadow-md ${
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
                                <span className="text-2xl font-bold">₹2,499</span>
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

          {/* Submit Button Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
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
                    });
                  }}
                >
                  Clear Form
                </Button>
                <Button
                  onClick={handleOnboardBusiness}
                  disabled={!newBusiness.name || !newBusiness.email || !newBusiness.category || !newBusiness.paymentPlan}
                  className="gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Create Business
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
                      ₹{newBusiness.paymentPlan === "qr-plus" ? "5,999" : "2,499"}
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
