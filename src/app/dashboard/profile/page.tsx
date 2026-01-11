"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getStoredUser,
  setStoredUser,
  getAuthToken,
  logout,
  User
} from "@/lib/auth";
import { UserRole } from "@/lib/types";
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  Shield,
  Users,
  Plus,
  Trash2,
  Save,
  LogOut,
  Settings,
  CheckCircle2,
  X,
  Edit,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  Lock,
  Building2
} from "lucide-react";
import { DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// API Sales Team Member type
interface SalesTeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [salesTeam, setSalesTeam] = useState<SalesTeamMember[]>([]);
  const [isLoadingSalesTeam, setIsLoadingSalesTeam] = useState(false);
  const [salesTeamError, setSalesTeamError] = useState<string | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [isEditMemberOpen, setIsEditMemberOpen] = useState(false);
  const [isUpdatingMember, setIsUpdatingMember] = useState(false);
  const [updateMemberError, setUpdateMemberError] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [editingMember, setEditingMember] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // Fetch sales team from API
  const fetchSalesTeam = useCallback(async () => {
    setIsLoadingSalesTeam(true);
    setSalesTeamError(null);

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.tribly.ai";
      const authToken = getAuthToken();

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${apiBaseUrl}/dashboard/v1/business_qr/sales_team`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch sales team");
      }

      const data = await response.json();

      if (data.status !== "success") {
        throw new Error(data.message || "Failed to fetch sales team");
      }

      // Map API response to local format
      const mappedTeam: SalesTeamMember[] = (data.data || []).map((member: any, index: number) => ({
        id: member.id || member._id || `member-${Date.now()}-${index}`,
        name: member.name || "",
        email: member.email || "",
        phone: member.phone || "",
        createdAt: member.created_at || member.createdAt || new Date().toISOString(),
      }));

      setSalesTeam(mappedTeam);
    } catch (error: any) {
      console.error("Error fetching sales team:", error);
      setSalesTeamError(error.message || "Failed to load sales team");
    } finally {
      setIsLoadingSalesTeam(false);
    }
  }, []);

  useEffect(() => {
    const currentUser = getStoredUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }

    // Ensure user has role property (migration for existing users)
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
      setStoredUser(updatedUser);
      setUser(updatedUser);
    } else {
      setUser(currentUser);
    }

    setProfileData({
      name: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone || "",
    });

    // Fetch sales team for admin users
    const isUserAdmin = currentUser.role === "admin" || (!currentUser.role && currentUser.email === "admin@tribly.com");
    if (isUserAdmin) {
      fetchSalesTeam();
    }
  }, [router, fetchSalesTeam]);

  const handleSaveProfile = () => {
    if (user) {
      const updatedUser = {
        ...user,
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
      };
      setStoredUser(updatedUser);
      setUser(updatedUser);
    }
  };

  const handleAddSalesTeamMember = async () => {
    if (!newMember.name || !newMember.email || !newMember.password) {
      setAddMemberError("Please fill in all required fields");
      return;
    }

    setIsAddingMember(true);
    setAddMemberError(null);

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.tribly.ai";
      const authToken = getAuthToken();

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${apiBaseUrl}/dashboard/v1/business_qr/sales_team`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: newMember.name.trim(),
          email: newMember.email.trim().toLowerCase(),
          password: newMember.password,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to add sales team member");
      }

      // Refresh the sales team list
      await fetchSalesTeam();

      // Reset form and close dialog
      setNewMember({ name: "", email: "", password: "" });
      setShowPassword(false);
      setIsAddMemberOpen(false);
    } catch (error: any) {
      console.error("Error adding sales team member:", error);
      setAddMemberError(error.message || "Failed to add member. Please try again.");
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveSalesTeamMember = (memberId: string) => {
    // For now, just remove from local state
    // TODO: Add API call for deletion when available
    setSalesTeam(prevTeam => prevTeam.filter(m => m.id !== memberId));
  };

  const handleEditSalesTeamMember = (member: SalesTeamMember) => {
    setEditingMemberId(member.id);
    setEditingMember({
      name: member.name,
      email: member.email,
      phone: member.phone || "",
    });
    setUpdateMemberError(null);
    setIsEditMemberOpen(true);
  };

  const handleUpdateSalesTeamMember = async () => {
    if (!editingMemberId || !editingMember.name || !editingMember.email) {
      setUpdateMemberError("Please fill in all required fields");
      return;
    }

    setIsUpdatingMember(true);
    setUpdateMemberError(null);

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.tribly.ai";
      const authToken = getAuthToken();

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${apiBaseUrl}/dashboard/v1/business_qr/sales_team`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          id: editingMemberId,
          name: editingMember.name.trim(),
          email: editingMember.email.trim().toLowerCase(),
          phone: editingMember.phone?.trim() || "",
        }),
      });

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to update sales team member");
      }

      // Refresh the sales team list
      await fetchSalesTeam();

      // Reset form and close dialog
      setEditingMember({ name: "", email: "", phone: "" });
      setEditingMemberId(null);
      setIsEditMemberOpen(false);
    } catch (error: any) {
      console.error("Error updating sales team member:", error);
      setUpdateMemberError(error.message || "Failed to update member. Please try again.");
    } finally {
      setIsUpdatingMember(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setStoredUser(null);
    router.push("/login");
  };


  const getRoleBadge = (role?: UserRole) => {
    const userRole = role || (
      (user?.email === "admin@tribly.com" || user?.email === "admin@tribly.ai" || user?.userType === "admin")
        ? "admin"
        : "sales-team"
    );

    if (userRole === "admin") {
      return (
        <Badge className="bg-purple-100 text-purple-700 border-purple-300">
          <Shield className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    } else if (userRole === "business") {
      return (
        <Badge variant="outline">
          <Building2 className="h-3 w-3 mr-1" />
          Business
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-300">
          <Users className="h-3 w-3 mr-1" />
          Sales Team
        </Badge>
      );
    }
  };

  if (!user) {
    return null;
  }

  // Check if user is admin (with fallback for email-based check)
  const isAdmin = user.role === "admin" || (!user.role && (user.email === "admin@tribly.com" || user.email === "admin@tribly.ai"));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F1FF] via-[#F3EBFF] to-[#EFE5FF]">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard")}
              className="hover:bg-white/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Profile</h1>
              <p className="text-muted-foreground">Manage your profile and account settings</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* User Profile Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-2xl font-bold">{user.name}</h2>
                {getRoleBadge(user?.role)}
              </div>
              <p className="text-muted-foreground">{user.email}</p>
            </CardContent>
          </Card>

          {/* Profile Information Card with Tabs */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>
                  Manage your personal information and sales team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className={isAdmin ? "grid w-full grid-cols-2" : "w-full"}>
                    <TabsTrigger value="personal" className="gap-2">
                      <UserIcon className="h-4 w-4" />
                      Personal Information
                    </TabsTrigger>
                    {isAdmin && (
                      <TabsTrigger value="sales-team" className="gap-2">
                        <Users className="h-4 w-4" />
                        Sales Team
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {/* Personal Information Tab */}
                  <TabsContent value="personal" className="space-y-4 mt-6">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Full Name</Label>
                        <div className="relative">
                          <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="name"
                            value={profileData.name}
                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                            className="pl-10"
                            placeholder="Enter your full name"
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            value={profileData.email}
                            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                            className="pl-10"
                            placeholder="Enter your email"
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            type="tel"
                            value={profileData.phone}
                            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                            className="pl-10"
                            placeholder="+91 98765 43210"
                          />
                        </div>
                      </div>
                      {user.createdAt && (
                        <div className="grid gap-2">
                          <Label>Member Since</Label>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {new Date(user.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button onClick={handleSaveProfile} className="gap-2">
                        <Save className="h-4 w-4" />
                        Save Changes
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Sales Team Tab (Admin Only) */}
                  {isAdmin && (
                    <TabsContent value="sales-team" className="space-y-4 mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">Sales Team Management</h3>
                          <p className="text-sm text-muted-foreground">
                            Manage your sales team members
                          </p>
                        </div>
                        <Dialog open={isAddMemberOpen} onOpenChange={(open) => {
                          setIsAddMemberOpen(open);
                          if (!open) {
                            setNewMember({ name: "", email: "", password: "" });
                            setShowPassword(false);
                            setAddMemberError(null);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button className="gap-2">
                              <Plus className="h-4 w-4" />
                              Add Member
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Sales Team Member</DialogTitle>
                              <DialogDescription>
                                Add a new member to your sales team
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              {addMemberError && (
                                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                  {addMemberError}
                                </div>
                              )}
                              <div className="grid gap-2">
                                <Label htmlFor="member-name">Full Name *</Label>
                                <div className="relative">
                                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    id="member-name"
                                    value={newMember.name}
                                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                                    placeholder="Enter full name"
                                    className="pl-10"
                                    disabled={isAddingMember}
                                  />
                                </div>
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="member-email">Email Address *</Label>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    id="member-email"
                                    type="email"
                                    value={newMember.email}
                                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                                    placeholder="member@example.com"
                                    className="pl-10"
                                    disabled={isAddingMember}
                                  />
                                </div>
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="member-password">Password *</Label>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    id="member-password"
                                    type={showPassword ? "text" : "password"}
                                    value={newMember.password}
                                    onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                                    placeholder="Enter password"
                                    className="pl-10 pr-10"
                                    disabled={isAddingMember}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    disabled={isAddingMember}
                                  >
                                    {showPassword ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  The member will use this password to login
                                </p>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setIsAddMemberOpen(false)}
                                disabled={isAddingMember}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleAddSalesTeamMember}
                                disabled={!newMember.name || !newMember.email || !newMember.password || isAddingMember}
                              >
                                {isAddingMember ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Adding...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Add Member
                                  </>
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Dialog open={isEditMemberOpen} onOpenChange={(open) => {
                          setIsEditMemberOpen(open);
                          if (!open) {
                            setEditingMember({ name: "", email: "", phone: "" });
                            setEditingMemberId(null);
                            setUpdateMemberError(null);
                          }
                        }}>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Sales Team Member</DialogTitle>
                              <DialogDescription>
                                Update the details of this sales team member
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              {updateMemberError && (
                                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                  {updateMemberError}
                                </div>
                              )}
                              <div className="grid gap-2">
                                <Label htmlFor="edit-member-name">Full Name *</Label>
                                <div className="relative">
                                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    id="edit-member-name"
                                    value={editingMember.name}
                                    onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                                    placeholder="Enter full name"
                                    className="pl-10"
                                    disabled={isUpdatingMember}
                                  />
                                </div>
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-member-email">Email Address *</Label>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    id="edit-member-email"
                                    type="email"
                                    value={editingMember.email}
                                    onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                                    placeholder="member@example.com"
                                    className="pl-10"
                                    disabled={isUpdatingMember}
                                  />
                                </div>
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-member-phone">Phone Number</Label>
                                <div className="relative">
                                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    id="edit-member-phone"
                                    type="tel"
                                    value={editingMember.phone}
                                    onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                                    className="pl-10"
                                    disabled={isUpdatingMember}
                                    placeholder="+91 98765 43210"
                                  />
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setIsEditMemberOpen(false)}
                                disabled={isUpdatingMember}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleUpdateSalesTeamMember}
                                disabled={!editingMember.name || !editingMember.email || isUpdatingMember}
                              >
                                {isUpdatingMember ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Update Member
                                  </>
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                      {isLoadingSalesTeam ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                          <Loader2 className="h-8 w-8 animate-spin mb-4" />
                          <p>Loading sales team...</p>
                        </div>
                      ) : salesTeamError ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive opacity-50" />
                          <p className="text-destructive">{salesTeamError}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4 gap-2"
                            onClick={fetchSalesTeam}
                          >
                            <RefreshCw className="h-4 w-4" />
                            Try Again
                          </Button>
                        </div>
                      ) : salesTeam.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No sales team members yet</p>
                          <p className="text-sm mt-2">Click "Add Member" to get started</p>
                        </div>
                      ) : (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {salesTeam.map((member) => (
                                <TableRow key={member.id}>
                                  <TableCell className="font-medium">{member.name}</TableCell>
                                  <TableCell>{member.email}</TableCell>
                                  <TableCell>{member.phone || "-"}</TableCell>
                                  <TableCell>
                                    {member.createdAt
                                      ? new Date(member.createdAt).toLocaleDateString()
                                      : "-"}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEditSalesTeamMember(member)}
                                        className="hover:text-primary"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveSalesTeamMember(member.id)}
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
