export type BusinessStatus = "active" | "inactive";

export type BusinessCategory =
  | "restaurant"
  | "retail"
  | "healthcare"
  | "beauty"
  | "fitness"
  | "automotive"
  | "real-estate"
  | "education"
  | "hospitality"
  | "other";

export type FeedbackTone = "professional" | "friendly" | "casual" | "formal";

export type UserRole = "admin" | "sales-team" | "business";

export type ReviewCategory = "product" | "staff" | "customer-experience" | "offers-discounts";

export interface Business {
  id: string;
  name: string;
  status: BusinessStatus;
  category: BusinessCategory;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  area?: string;
  overview?: string; // Business overview/description
  createdAt: string;
  updatedAt: string;
  // QR Code
  qrCodeUrl?: string;
  // Links
  reviewUrl?: string; // Unique short URL for reviews
  googleBusinessReviewLink?: string;
  socialMediaLink?: string;
  // Settings
  feedbackTone: FeedbackTone;
  autoReplyEnabled: boolean;
  // Payment
  paymentPlan?: "qr-basic" | "qr-plus";
  paymentStatus?: "active" | "past-due" | "cancelled";
  paymentExpiryDate?: string; // ISO date string for plan expiry
  // Sales Team
  salesTeamId?: string; // ID of the sales team member who onboarded this business
  // SEO
  keywords?: string[]; // SEO keywords for the business
  // Stats
  totalReviews: number;
  activeReviews: number;
  inactiveReviews: number;
  reviewsInQueue: number;
}

export interface Review {
  id: string;
  businessId: string;
  rating: "excellent" | "good" | "not-expected";
  feedback?: string;
  category?: ReviewCategory; // Category of the review feedback
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  status: "pending" | "responded" | "archived";
  autoReplySent: boolean;
  createdAt: string;
}

