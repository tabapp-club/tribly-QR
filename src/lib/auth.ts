// Simple authentication utilities
// In a real app, this would integrate with your backend/auth service

import { UserRole } from "./types";
import { getBusinessByEmail, BUSINESS_CREDENTIALS } from "./mock-data";
import { generateBusinessSlug } from "./business-slug";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  createdAt?: string;
  businessId?: string; // For business users, link to their business
}

// Mock users for development
const MOCK_USERS: User[] = [
  {
  id: "1",
  email: "admin@tribly.com",
  name: "Admin User",
    role: "admin",
    phone: "+91 98765 43210",
    createdAt: "2024-01-01T00:00:00Z",
  },
];

// Mock credentials for development
const MOCK_CREDENTIALS = {
  email: "admin@tribly.com",
  password: "admin123",
};

export async function login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Normalize email (trim and lowercase)
  const normalizedEmail = email.trim().toLowerCase();

  // In a real app, this would make an API call to your backend
  if (normalizedEmail === MOCK_CREDENTIALS.email.toLowerCase() && password === MOCK_CREDENTIALS.password) {
    const user = MOCK_USERS.find(u => u.email.toLowerCase() === normalizedEmail);
    if (user) {
      return {
        success: true,
        user: user,
      };
    }
  }

  // Check if it's a sales team member
  const salesTeam = getSalesTeam();
  const salesUser = salesTeam.find(u => u.email.toLowerCase() === normalizedEmail);
  if (salesUser && password === "sales123") {
    return {
      success: true,
      user: salesUser,
    };
  }

  // Check if it's a business user
  const business = getBusinessByEmail(normalizedEmail);
  if (business) {
    const businessPassword = BUSINESS_CREDENTIALS[business.email.toLowerCase()];
    if (businessPassword && password === businessPassword) {
      return {
        success: true,
        user: {
          id: `business-user-${business.id}`,
          email: business.email,
          name: business.name,
          role: "business" as UserRole,
          phone: business.phone,
          businessId: business.id,
          createdAt: business.createdAt,
        },
      };
    }
  }

  return {
    success: false,
    error: "Invalid email or password",
  };
}

export async function logout(): Promise<void> {
  // In a real app, this would make an API call to invalidate the session
  await new Promise((resolve) => setTimeout(resolve, 200));
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("tribly_user");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

export function setStoredUser(user: User | null): void {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem("tribly_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("tribly_user");
  }
}

// Sales Team Management
export function getSalesTeam(): User[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("tribly_sales_team");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  // Initialize with a test sales team member if none exist
  const defaultSalesTeam: User[] = [
    {
      id: "sales-test-1",
      email: "sales@tribly.com",
      name: "Test Sales User",
      role: "sales-team",
      phone: "+91 98765 43210",
      createdAt: new Date().toISOString(),
    },
  ];
  setSalesTeam(defaultSalesTeam);
  return defaultSalesTeam;
}

export function setSalesTeam(team: User[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("tribly_sales_team", JSON.stringify(team));
}

export function addSalesTeamMember(member: Omit<User, "id" | "createdAt">): User {
  const team = getSalesTeam();
  const newMember: User = {
    ...member,
    id: `sales-${Date.now()}`,
    role: "sales-team",
    createdAt: new Date().toISOString(),
  };
  team.push(newMember);
  setSalesTeam(team);
  return newMember;
}

export function removeSalesTeamMember(memberId: string): void {
  const team = getSalesTeam();
  const filtered = team.filter(m => m.id !== memberId);
  setSalesTeam(filtered);
}

