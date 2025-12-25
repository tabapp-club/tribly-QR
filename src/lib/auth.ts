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
  salesPersonId?: string; // Unique ID for sales team members
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
      salesPersonId: "tribe" + String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
    },
  ];
  setSalesTeam(defaultSalesTeam);
  return defaultSalesTeam;
}

export function setSalesTeam(team: User[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("tribly_sales_team", JSON.stringify(team));
}

export function addSalesTeamMember(member: Omit<User, "id" | "createdAt" | "salesPersonId">): User {
  const team = getSalesTeam();
  // Generate unique salesPersonId (tribeXXXX format with random numbers)
  const existingIds = team
    .filter(m => m.salesPersonId)
    .map(m => m.salesPersonId || "");
  
  let salesPersonId: string;
  let attempts = 0;
  const maxAttempts = 100; // Prevent infinite loop
  
  // Generate random ID and ensure it's unique
  do {
    const randomNum = Math.floor(Math.random() * 10000);
    salesPersonId = `tribe${String(randomNum).padStart(4, '0')}`;
    attempts++;
  } while (existingIds.includes(salesPersonId) && attempts < maxAttempts);
  
  // Fallback to timestamp-based if all random attempts fail (very unlikely)
  if (attempts >= maxAttempts) {
    const timestamp = Date.now().toString().slice(-4);
    salesPersonId = `tribe${timestamp}`;
  }
  
  const newMember: User = {
    ...member,
    id: `sales-${Date.now()}`,
    role: "sales-team",
    createdAt: new Date().toISOString(),
    salesPersonId,
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

export function updateSalesTeamMember(memberId: string, updates: Partial<Omit<User, "id" | "createdAt" | "role">>): User | null {
  const team = getSalesTeam();
  const memberIndex = team.findIndex(m => m.id === memberId);
  if (memberIndex === -1) return null;
  
  const updatedMember: User = {
    ...team[memberIndex],
    ...updates,
  };
  team[memberIndex] = updatedMember;
  setSalesTeam(team);
  return updatedMember;
}

