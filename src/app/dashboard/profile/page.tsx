"use client";

import { useState, useEffect } from "react";
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
  getSalesTeam,
  addSalesTeamMember,
  removeSalesTeamMember,
  updateSalesTeamMember,
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
    Edit
  } from "lucide-react";
import { DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [salesTeam, setSalesTeam] = useState<User[]>([]);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isEditMemberOpen, setIsEditMemberOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [editingMember, setEditingMember] = useState({
    name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    const currentUser = getStoredUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }

    // Ensure user has role property (migration for existing users)
    if (!currentUser.role) {
      // Default to admin for existing admin@tribly.com users
      const updatedUser = {
        ...currentUser,
        role: (currentUser.email === "admin@tribly.com" ? "admin" : "sales-team") as UserRole,
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
    setSalesTeam(getSalesTeam());
  }, [router]);

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

  const handleAddSalesTeamMember = () => {
    if (!newMember.name || !newMember.email) {
      return;
    }
    const member = addSalesTeamMember({
      ...newMember,
      role: "sales-team" as UserRole,
    });
    setSalesTeam(getSalesTeam());
    setNewMember({ name: "", email: "", phone: "" });
    setIsAddMemberOpen(false);
  };

  const handleRemoveSalesTeamMember = (memberId: string) => {
    removeSalesTeamMember(memberId);
    setSalesTeam(getSalesTeam());
  };

  const handleEditSalesTeamMember = (member: User) => {
    setEditingMemberId(member.id);
    setEditingMember({
      name: member.name,
      email: member.email,
      phone: member.phone || "",
    });
    setIsEditMemberOpen(true);
  };

  const handleUpdateSalesTeamMember = () => {
    if (!editingMemberId || !editingMember.name || !editingMember.email) {
      return;
    }
    updateSalesTeamMember(editingMemberId, editingMember);
    setSalesTeam(getSalesTeam());
    setEditingMember({ name: "", email: "", phone: "" });
    setEditingMemberId(null);
    setIsEditMemberOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setStoredUser(null);
    router.push("/login");
  };


  const getRoleBadge = (role?: UserRole) => {
    const userRole = role || (user?.email === "admin@tribly.com" ? "admin" : "sales-team");
    return userRole === "admin" ? (
      <Badge className="bg-purple-100 text-purple-700 border-purple-300">
        <Shield className="h-3 w-3 mr-1" />
        Admin
      </Badge>
    ) : (
      <Badge className="bg-blue-100 text-blue-700 border-blue-300">
        <Users className="h-3 w-3 mr-1" />
        Sales Team
      </Badge>
    );
  };

  if (!user) {
    return null;
  }

  // Check if user is admin (with fallback for email-based check)
  const isAdmin = user.role === "admin" || (!user.role && user.email === "admin@tribly.com");

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
                        <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
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
                              <div className="grid gap-2">
                                <Label htmlFor="member-salesperson-id">Sales Person ID</Label>
                                <Input
                                  id="member-salesperson-id"
                                  value="Auto-generated"
                                  disabled
                                  className="bg-muted"
                                />
                                <p className="text-xs text-muted-foreground">
                                  A unique ID will be automatically generated when you add the member
                                </p>
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="member-name">Full Name *</Label>
                                <Input
                                  id="member-name"
                                  value={newMember.name}
                                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                                  placeholder="Enter full name"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="member-email">Email Address *</Label>
                                <Input
                                  id="member-email"
                                  type="email"
                                  value={newMember.email}
                                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                                  placeholder="member@example.com"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="member-phone">Phone Number</Label>
                                <Input
                                  id="member-phone"
                                  type="tel"
                                  value={newMember.phone}
                                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                                  placeholder="+91 98765 43210"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Default password for new members: <strong>sales123</strong>
                              </p>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
                                Cancel
                              </Button>
                              <Button
                                onClick={handleAddSalesTeamMember}
                                disabled={!newMember.name || !newMember.email}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Add Member
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Dialog open={isEditMemberOpen} onOpenChange={setIsEditMemberOpen}>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Sales Team Member</DialogTitle>
                              <DialogDescription>
                                Update the details of this sales team member
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label htmlFor="edit-member-salesperson-id">Sales Person ID</Label>
                                <Input
                                  id="edit-member-salesperson-id"
                                  value={salesTeam.find(m => m.id === editingMemberId)?.salesPersonId || "-"}
                                  disabled
                                  className="bg-muted font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Sales Person ID cannot be changed
                                </p>
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-member-name">Full Name *</Label>
                                <Input
                                  id="edit-member-name"
                                  value={editingMember.name}
                                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                                  placeholder="Enter full name"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-member-email">Email Address *</Label>
                                <Input
                                  id="edit-member-email"
                                  type="email"
                                  value={editingMember.email}
                                  onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                                  placeholder="member@example.com"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="edit-member-phone">Phone Number</Label>
                                <Input
                                  id="edit-member-phone"
                                  type="tel"
                                  value={editingMember.phone}
                                  onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                                  placeholder="+91 98765 43210"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsEditMemberOpen(false)}>
                                Cancel
                              </Button>
                              <Button
                                onClick={handleUpdateSalesTeamMember}
                                disabled={!editingMember.name || !editingMember.email}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Update Member
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                      {salesTeam.length === 0 ? (
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
                                <TableHead>Sales Person ID</TableHead>
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
                                  <TableCell className="font-mono font-medium">{member.salesPersonId || "-"}</TableCell>
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
