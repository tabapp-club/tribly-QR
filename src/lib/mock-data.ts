import { Business, Review } from "./types";

// Mock data for development
export const mockBusinesses: Business[] = [
  {
    id: "1",
    name: "The Coffee House",
    status: "active",
    category: "restaurant",
    email: "contact@coffeehouse.com",
    phone: "+91 98765 43210",
    address: "123 Main St, City, State 12345",
    city: "Mumbai",
    area: "Bandra",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-20T14:30:00Z",
    qrCodeUrl: "/qr-codes/coffee-house.png",
    googleBusinessReviewLink: "https://g.page/r/coffee-house/review",
    feedbackTone: "friendly",
    autoReplyEnabled: true,
    paymentPlan: "qr-plus",
    paymentStatus: "active",
    paymentExpiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days from now (within 60 days - due date)
    billingDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    totalReviews: 245,
    activeReviews: 198,
    inactiveReviews: 35,
    reviewsInQueue: 12,
  },
  {
    id: "2",
    name: "FitZone Gym",
    status: "active",
    category: "fitness",
    email: "info@fitzone.com",
    phone: "+91 98765 43211",
    address: "456 Fitness Ave, City, State 12345",
    city: "Delhi",
    area: "Connaught Place",
    createdAt: "2024-02-01T09:00:00Z",
    updatedAt: "2024-02-15T11:20:00Z",
    qrCodeUrl: "/qr-codes/fitzone.png",
    googleBusinessReviewLink: "https://g.page/r/fitzone/review",
    feedbackTone: "professional",
    autoReplyEnabled: true,
    paymentPlan: "qr-basic",
    paymentStatus: "past-due",
    paymentExpiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
    billingDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago (pending)
    totalReviews: 189,
    activeReviews: 156,
    inactiveReviews: 28,
    reviewsInQueue: 5,
  },
  {
    id: "3",
    name: "Beauty Salon Pro",
    status: "inactive",
    category: "beauty",
    email: "hello@beautysalon.com",
    phone: "+91 98765 43212",
    address: "789 Beauty Blvd, City, State 12345",
    city: "Bangalore",
    area: "Koramangala",
    createdAt: "2024-01-10T08:00:00Z",
    updatedAt: "2024-01-25T16:45:00Z",
    qrCodeUrl: "/qr-codes/beauty-salon.png",
    googleBusinessReviewLink: "https://g.page/r/beauty-salon/review",
    feedbackTone: "casual",
    autoReplyEnabled: false,
    paymentPlan: "qr-basic",
    paymentStatus: "past-due",
    paymentExpiryDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago (expired)
    billingDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(), // 35 days ago (inactive due to > 30 days pending)
    totalReviews: 92,
    activeReviews: 67,
    inactiveReviews: 20,
    reviewsInQueue: 5,
  },
  {
    id: "4",
    name: "Tech Solutions Inc",
    status: "active",
    category: "other",
    email: "contact@techsolutions.com",
    phone: "+91 98765 43213",
    address: "321 Tech Park, City, State 12345",
    city: "Hyderabad",
    area: "Hitech City",
    createdAt: "2024-03-01T12:00:00Z",
    updatedAt: "2024-03-01T12:00:00Z",
    feedbackTone: "professional",
    autoReplyEnabled: false,
    paymentPlan: "qr-basic",
    paymentStatus: "active",
    paymentExpiryDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(), // 120 days from now
    billingDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    salesTeamId: "sales-1", // Example: assigned to a sales team member
    totalReviews: 0,
    activeReviews: 0,
    inactiveReviews: 0,
    reviewsInQueue: 0,
  },
  {
    id: "5",
    name: "Green Leaf Restaurant",
    status: "active",
    category: "restaurant",
    email: "info@greenleaf.com",
    phone: "+91 98765 43214",
    address: "654 Food St, City, State 12345",
    city: "Pune",
    area: "Koregaon Park",
    createdAt: "2024-02-10T10:30:00Z",
    updatedAt: "2024-02-28T15:00:00Z",
    qrCodeUrl: "/qr-codes/green-leaf.png",
    googleBusinessReviewLink: "https://g.page/r/green-leaf/review",
    feedbackTone: "friendly",
    autoReplyEnabled: true,
    paymentPlan: "qr-plus",
    paymentStatus: "active",
    paymentExpiryDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(), // 100 days from now
    billingDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    totalReviews: 312,
    activeReviews: 278,
    inactiveReviews: 30,
    reviewsInQueue: 4,
  },
];

export const getBusinessById = (id: string): Business | undefined => {
  return mockBusinesses.find((b) => b.id === id);
};

export const getSummaryStats = () => {
  const totalBusinesses = mockBusinesses.length;
  const activeBusinesses = mockBusinesses.filter((b) => b.status === "active").length;
  const inactiveBusinesses = mockBusinesses.filter((b) => b.status === "inactive").length;
  const totalReviews = mockBusinesses.reduce((sum, b) => sum + b.totalReviews, 0);
  const totalReviewsInQueue = mockBusinesses.reduce((sum, b) => sum + b.reviewsInQueue, 0);

  return {
    totalBusinesses,
    activeBusinesses,
    inactiveBusinesses,
    totalReviews,
    totalReviewsInQueue,
  };
};

// Mock reviews data
export const mockReviews: Review[] = [
  {
    id: "rev-1",
    businessId: "1",
    rating: "need-improvement",
    feedback: "The service was very slow today. I had to wait for more than 30 minutes for my order. The staff seemed overwhelmed and not attentive to customer needs.",
    category: "staff",
    customerName: "Rajesh Kumar",
    customerEmail: "rajesh.kumar@email.com",
    customerPhone: "+91 98765 43220",
    status: "pending",
    autoReplySent: false,
    createdAt: "2024-03-15T14:30:00Z",
  },
  {
    id: "rev-2",
    businessId: "1",
    rating: "need-improvement",
    feedback: "The coffee quality has declined recently. It doesn't taste as good as it used to. Also, the prices have increased significantly.",
    category: "product",
    customerName: "Priya Sharma",
    customerEmail: "priya.sharma@email.com",
    customerPhone: "+91 98765 43221",
    status: "responded",
    autoReplySent: true,
    createdAt: "2024-03-12T10:15:00Z",
  },
  {
    id: "rev-3",
    businessId: "2",
    rating: "need-improvement",
    feedback: "The gym equipment is outdated and some machines are not working properly. The locker room cleanliness needs improvement.",
    category: "product",
    customerName: "Amit Patel",
    customerEmail: "amit.patel@email.com",
    customerPhone: "+91 98765 43222",
    status: "pending",
    autoReplySent: false,
    createdAt: "2024-03-18T16:45:00Z",
  },
  {
    id: "rev-4",
    businessId: "3",
    rating: "need-improvement",
    feedback: "I had a bad experience with the hair treatment. The stylist didn't listen to my requirements and the result was not what I expected.",
    category: "staff",
    customerName: "Sneha Reddy",
    customerEmail: "sneha.reddy@email.com",
    customerPhone: "+91 98765 43223",
    status: "pending",
    autoReplySent: false,
    createdAt: "2024-03-20T11:20:00Z",
  },
  {
    id: "rev-5",
    businessId: "5",
    rating: "need-improvement",
    feedback: "The food took too long to arrive and when it did, it was cold. The waiter was not helpful when we complained about it.",
    category: "customer-experience",
    customerName: "Vikram Singh",
    customerEmail: "vikram.singh@email.com",
    customerPhone: "+91 98765 43224",
    status: "responded",
    autoReplySent: true,
    createdAt: "2024-03-19T19:30:00Z",
  },
  {
    id: "rev-6",
    businessId: "1",
    rating: "need-improvement",
    feedback: "The WiFi connection was very poor and the seating area was too crowded. Couldn't work peacefully.",
    category: "customer-experience",
    customerName: "Anjali Mehta",
    customerEmail: "anjali.mehta@email.com",
    customerPhone: "+91 98765 43225",
    status: "pending",
    autoReplySent: false,
    createdAt: "2024-03-21T09:00:00Z",
  },
];

export const getReviewsByBusinessId = (businessId: string): Review[] => {
  return mockReviews.filter((review) => review.businessId === businessId && review.rating === "need-improvement");
};

// Function to add a new business (used when onboarding)
export const addBusiness = (business: Omit<Business, "id" | "createdAt" | "updatedAt" | "totalReviews" | "activeReviews" | "inactiveReviews" | "reviewsInQueue">): Business => {
  const newBusiness: Business = {
    ...business,
    id: `business-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalReviews: 0,
    activeReviews: 0,
    inactiveReviews: 0,
    reviewsInQueue: 0,
  };
  mockBusinesses.push(newBusiness);
  return newBusiness;
};

// Function to get businesses filtered by sales team member
// Function to get businesses for a sales team member
export const getBusinessesBySalesTeamId = (salesTeamId: string): Business[] => {
  return mockBusinesses.filter((b) => b.salesTeamId === salesTeamId);
};

// Business credentials mapping (email -> password)
// In production, this would be stored securely in a database
export const BUSINESS_CREDENTIALS: Record<string, string> = {
  "contact@coffeehouse.com": "coffee123",
  "info@fitzone.com": "fitzone123",
  "hello@beautysalon.com": "beauty123",
  "contact@techsolutions.com": "tech123",
  "info@greenleaf.com": "greenleaf123",
};

// Get business by email
export const getBusinessByEmail = (email: string): Business | undefined => {
  return mockBusinesses.find((b) => b.email.toLowerCase() === email.toLowerCase());
};

