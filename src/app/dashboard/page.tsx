"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockBusinesses } from "@/lib/mock-data";
import { Business, BusinessStatus, BusinessCategory } from "@/lib/types";
import { logout, setStoredUser, getStoredUser, getSalesTeam } from "@/lib/auth";
import { generateBusinessSlug } from "@/lib/business-slug";
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Search, 
  FileText,
  Filter,
  X,
  LogOut,
  User,
  ChevronDown,
  Mail,
  Phone,
  MapPin,
  UserCircle
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<BusinessCategory | "all">("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [onboardedByFilter, setOnboardedByFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<BusinessStatus | "all">("all");
  const [user, setUser] = useState(getStoredUser());

  useEffect(() => {
    const currentUser = getStoredUser();
    if (currentUser) {
      // Ensure user has role property (migration for existing users)
      if (!currentUser.role) {
        // Default to admin for existing admin@tribly.com users
        const updatedUser = {
          ...currentUser,
          role: currentUser.email === "admin@tribly.com" ? "admin" : "sales-team",
        };
        setStoredUser(updatedUser);
        setUser(updatedUser);
      } else {
        setUser(currentUser);
      }
      
      // Redirect sales team members to sales dashboard
      if (currentUser.role === "sales-team") {
        router.push("/sales-dashboard");
        return;
      }
      
    }
  }, [router]);

  const handleLogout = async () => {
    await logout();
    setStoredUser(null);
    router.push("/login");
  };

  // Get businesses based on user role
  const availableBusinesses = useMemo(() => {
    if (!user) return [];
    
    // Sales team sees only businesses they onboarded
    if (user.role === "sales-team") {
      return mockBusinesses.filter((b) => b.salesTeamId === user.id);
    }
    
    // Admin sees all businesses
    return mockBusinesses;
  }, [user]);


  // Get unique cities for city filter
  const uniqueCities = useMemo(() => {
    const cities = availableBusinesses
      .map((b) => b.city)
      .filter((city): city is string => Boolean(city));
    return Array.from(new Set(cities)).sort();
  }, [availableBusinesses]);

  // Get unique areas based on selected city
  const uniqueAreas = useMemo(() => {
    if (cityFilter === "all") {
      // If no city selected, show all areas
      const areas = availableBusinesses
        .map((b) => b.area)
        .filter((area): area is string => Boolean(area));
      return Array.from(new Set(areas)).sort();
    } else {
      // If city selected, show only areas in that city
      const areas = availableBusinesses
        .filter((b) => b.city === cityFilter)
        .map((b) => b.area)
        .filter((area): area is string => Boolean(area));
      return Array.from(new Set(areas)).sort();
    }
  }, [cityFilter, availableBusinesses]);

  // Get sales team for filter
  const salesTeam = useMemo(() => {
    return getSalesTeam();
  }, []);

  // Helper function to get sales team member name by ID
  const getSalesTeamMemberName = (salesTeamId?: string): string => {
    if (!salesTeamId) return "Admin";
    const member = salesTeam.find(m => m.id === salesTeamId);
    return member ? member.name : "Unknown";
  };

  const filteredBusinesses = useMemo(() => {
    let filtered = availableBusinesses;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (business) =>
          business.name.toLowerCase().includes(query) ||
          business.email.toLowerCase().includes(query) ||
          business.category.toLowerCase().includes(query) ||
          business.city?.toLowerCase().includes(query) ||
          business.area?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((business) => business.category === categoryFilter);
    }

    // Apply city filter
    if (cityFilter !== "all") {
      filtered = filtered.filter((business) => business.city === cityFilter);
    }

    // Apply area filter
    if (areaFilter !== "all") {
      filtered = filtered.filter((business) => business.area === areaFilter);
    }

    // Apply onboarded by filter
    if (onboardedByFilter !== "all") {
      if (onboardedByFilter === "admin") {
        // Filter for businesses without salesTeamId (onboarded by admin)
        filtered = filtered.filter((business) => !business.salesTeamId);
      } else {
        // Filter for businesses onboarded by specific sales team member
        filtered = filtered.filter((business) => business.salesTeamId === onboardedByFilter);
      }
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((business) => business.status === statusFilter);
    }

    return filtered;
  }, [searchQuery, categoryFilter, cityFilter, areaFilter, onboardedByFilter, statusFilter, availableBusinesses]);

  const hasActiveFilters = categoryFilter !== "all" || cityFilter !== "all" || areaFilter !== "all" || onboardedByFilter !== "all" || statusFilter !== "all" || searchQuery.trim() !== "";

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setCityFilter("all");
    setAreaFilter("all");
    setOnboardedByFilter("all");
    setStatusFilter("all");
  };

  const handleCityFilterChange = (value: string) => {
    setCityFilter(value);
    // Reset area filter when city changes
    setAreaFilter("all");
  };

  const handleBusinessClick = (business: Business) => {
    const slug = generateBusinessSlug(business);
    router.push(`/dashboard/business/${slug}`);
  };

  const getStatusBadge = (status: BusinessStatus) => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F1FF] via-[#F3EBFF] to-[#EFE5FF]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              {user?.role === "sales-team" 
                ? "Manage your onboarded businesses" 
                : "Manage your businesses and reviews"}
            </p>
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
                  <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
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

        {/* Filters Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
                <CardDescription>Filter businesses by category, location, or search</CardDescription>
              </div>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name, email, category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label htmlFor="category-filter">Category</Label>
                <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as BusinessCategory | "all")}>
                  <SelectTrigger id="category-filter">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
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

              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as BusinessStatus | "all")}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* City Filter */}
              <div className="space-y-2">
                <Label htmlFor="city-filter">City</Label>
                <Select value={cityFilter} onValueChange={handleCityFilterChange}>
                  <SelectTrigger id="city-filter">
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {uniqueCities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Area Filter */}
              <div className="space-y-2">
                <Label htmlFor="area-filter">Area</Label>
                <Select 
                  value={areaFilter} 
                  onValueChange={setAreaFilter}
                  disabled={cityFilter !== "all" && uniqueAreas.length === 0}
                >
                  <SelectTrigger id="area-filter">
                    <SelectValue placeholder={cityFilter !== "all" && uniqueAreas.length === 0 ? "No areas available" : "All Areas"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    {uniqueAreas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Onboarded By Filter */}
              <div className="space-y-2">
                <Label htmlFor="onboarded-by-filter">Onboarded By</Label>
                <Select value={onboardedByFilter} onValueChange={setOnboardedByFilter}>
                  <SelectTrigger id="onboarded-by-filter">
                    <SelectValue placeholder="All Sales Team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sales Team</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {salesTeam.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>All Businesses ({filteredBusinesses.length})</CardTitle>
                <CardDescription>
                  {user?.role === "sales-team" 
                    ? "Manage your onboarded businesses"
                    : filteredBusinesses.length === availableBusinesses.length
                    ? "Manage and view all your businesses"
                    : `Showing ${filteredBusinesses.length} of ${availableBusinesses.length} businesses`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredBusinesses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No businesses found</p>
                </div>
              ) : (
                filteredBusinesses.map((business) => (
                  <div
                    key={business.id}
                    onClick={() => handleBusinessClick(business)}
                    className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{business.name}</h3>
                          {getStatusBadge(business.status)}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {business.category.charAt(0).toUpperCase() + business.category.slice(1)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {business.email}
                          </span>
                          {business.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {business.phone}
                            </span>
                          )}
                          {business.city && business.area && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {business.city}, {business.area}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <UserCircle className="h-3 w-3" />
                            Onboarded by {getSalesTeamMemberName(business.salesTeamId)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">{business.totalReviews}</div>
                          <div className="text-xs text-muted-foreground">Total Reviews</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

