import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Shield, ShieldOff, MoreHorizontal, ChevronLeft, ChevronRight, ArrowUpDown, DollarSign, Eye, Copy, Link2, Users as UsersIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UnifiedUser {
  id: string;
  display_name: string;
  email: string;
  balance_usd: number;
  status: string;
  created_at: string;
  type: "test" | "real";
  role?: string;
  referral_code?: string | null;
  referred_by?: string | null;
}

interface UserDetails {
  totalSpent: number;
  apiKeys: number;
  devices: number;
  transactions: number;
  referralCount: number;
  referrer: { display_name: string | null; email: string | null; referral_code: string | null } | null;
  referredUsers: Array<{ user_id: string; display_name: string | null; email: string | null; created_at: string }>;
}

type SortField = "display_name" | "balance_usd" | "created_at" | "status";
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE = 20;

export const AdminUsers = () => {
  const [users, setUsers] = useState<UnifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [balanceFilter, setBalanceFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [editingUser, setEditingUser] = useState<UnifiedUser | null>(null);
  const [newBalance, setNewBalance] = useState("");
  const [viewingUser, setViewingUser] = useState<UnifiedUser | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [referralCodeDraft, setReferralCodeDraft] = useState("");
  const [savingCode, setSavingCode] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch test users
      const { data: testData, error: testError } = await supabase
        .from("test_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (testError) throw testError;

      // Fetch real users (profiles + roles + wallets)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, email, created_at, referral_code, referred_by")
        .order("created_at", { ascending: false });

      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const { data: wallets } = await supabase.from("wallets").select("user_id, balance_usd");

      // Convert test users to unified format
      const testUsersUnified: UnifiedUser[] = (testData || []).map((u) => ({
        id: u.id,
        display_name: u.display_name,
        email: u.email,
        balance_usd: Number(u.balance_usd),
        status: u.status,
        created_at: u.created_at,
        type: "test" as const,
      }));

      // Convert real users to unified format
      const realUsersUnified: UnifiedUser[] = (profiles || []).map((p: any) => ({
        id: p.user_id,
        display_name: p.display_name || "",
        email: p.email || "",
        balance_usd: Number(wallets?.find((w) => w.user_id === p.user_id)?.balance_usd || 0),
        status: "active",
        created_at: p.created_at,
        type: "real" as const,
        role: roles?.find((r) => r.user_id === p.user_id)?.role || "user",
        referral_code: p.referral_code ?? null,
        referred_by: p.referred_by ?? null,
      }));

      setUsers([...realUsersUnified, ...testUsersUnified]);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, balanceFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      if (newRole === "user") {
        await supabase.from("user_roles").delete().eq("user_id", userId);
      } else {
        const { error } = await supabase
          .from("user_roles")
          .upsert({ user_id: userId, role: newRole as "admin" | "moderator" | "user" }, { onConflict: "user_id,role" });
        if (error) throw error;
      }
      toast.success("User role updated");
      fetchData();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  };

  const handleBalanceEdit = (user: UnifiedUser) => {
    setEditingUser(user);
    setNewBalance(user.balance_usd.toFixed(4));
  };

  const handleBalanceSave = async () => {
    if (!editingUser) return;
    const value = parseFloat(newBalance);
    if (isNaN(value) || value < 0) {
      toast.error("Invalid balance value");
      return;
    }
    try {
      if (editingUser.type === "test") {
        const { error } = await supabase
          .from("test_users")
          .update({ balance_usd: value })
          .eq("id", editingUser.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("wallets")
          .update({ balance_usd: value })
          .eq("user_id", editingUser.id);
        if (error) throw error;
      }
      toast.success(`Balance updated to $${value.toFixed(4)}`);
      setEditingUser(null);
      fetchData();
    } catch (error) {
      console.error("Error updating balance:", error);
      toast.error("Failed to update balance");
    }
  };

  const openUserView = async (user: UnifiedUser) => {
    setViewingUser(user);
    setReferralCodeDraft(user.referral_code || "");
    setUserDetails(null);
    if (user.type !== "real") return;
    setDetailsLoading(true);
    try {
      const [spentRes, keysRes, devicesRes, txRes, refUsersRes, referrerRes] = await Promise.all([
        supabase.rpc("get_total_spent_for_user", { user_id_param: user.id }),
        supabase.from("api_keys").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("provider_devices").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("wallet_transactions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase
          .from("profiles")
          .select("user_id, display_name, email, created_at")
          .eq("referred_by", user.id)
          .order("created_at", { ascending: false }),
        user.referred_by
          ? supabase
              .from("profiles")
              .select("display_name, email, referral_code")
              .eq("user_id", user.referred_by)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      setUserDetails({
        totalSpent: Number(spentRes.data || 0),
        apiKeys: keysRes.count || 0,
        devices: devicesRes.count || 0,
        transactions: txRes.count || 0,
        referralCount: (refUsersRes.data || []).length,
        referrer: (referrerRes as any).data || null,
        referredUsers: (refUsersRes.data || []) as any,
      });
    } catch (e) {
      console.error("Error loading user details:", e);
      toast.error("Failed to load user details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSaveReferralCode = async () => {
    if (!viewingUser || viewingUser.type !== "real") return;
    const code = referralCodeDraft.trim();
    if (code && !/^[A-Za-z0-9_-]{3,32}$/.test(code)) {
      toast.error("Code must be 3–32 chars: letters, digits, _ or -");
      return;
    }
    setSavingCode(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ referral_code: code || null })
        .eq("user_id", viewingUser.id);
      if (error) {
        if ((error as any).code === "23505") {
          toast.error("This referral code is already taken");
        } else {
          throw error;
        }
        return;
      }
      toast.success(code ? "Referral code saved" : "Referral code removed");
      setViewingUser({ ...viewingUser, referral_code: code || null });
      fetchData();
    } catch (e) {
      console.error("Error saving referral code:", e);
      toast.error("Failed to save referral code");
    } finally {
      setSavingCode(false);
    }
  };

  const generateReferralCode = () => {
    const base = (viewingUser?.display_name || viewingUser?.email || "user")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 8) || "user";
    const suffix = Math.random().toString(36).slice(2, 6);
    setReferralCodeDraft(`${base}${suffix}`);
  };

  const copyReferralLink = () => {
    if (!viewingUser?.referral_code) return;
    const link = `${window.location.origin}/auth?ref=${viewingUser.referral_code}`;
    navigator.clipboard.writeText(link);
    toast.success("Referral link copied");
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Filter and sort users
  const filteredUsers = users
    .filter((user) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        user.display_name.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      const matchesBalance =
        balanceFilter === "all" ||
        (balanceFilter === "zero" && user.balance_usd === 0) ||
        (balanceFilter === "positive" && user.balance_usd > 0);
      return matchesSearch && matchesStatus && matchesBalance;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === "display_name") {
        comparison = a.display_name.localeCompare(b.display_name);
      } else if (sortField === "balance_usd") {
        comparison = a.balance_usd - b.balance_usd;
      } else if (sortField === "created_at") {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === "status") {
        comparison = a.status.localeCompare(b.status);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground">View and manage platform users</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={balanceFilter} onValueChange={setBalanceFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Balance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Balances</SelectItem>
                <SelectItem value="zero">Zero Balance</SelectItem>
                <SelectItem value="positive">Positive Balance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-[600px] w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]"><SortButton field="display_name">Name</SortButton></TableHead>
                  <TableHead className="hidden md:table-cell min-w-[180px]">Email</TableHead>
                  <TableHead className="min-w-[110px]"><SortButton field="balance_usd">Balance</SortButton></TableHead>
                  <TableHead className="hidden sm:table-cell min-w-[100px]"><SortButton field="status">Status</SortButton></TableHead>
                  <TableHead className="hidden lg:table-cell min-w-[120px]"><SortButton field="created_at">Joined</SortButton></TableHead>
                  <TableHead className="w-[44px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => (
                    <TableRow key={user.id} className="cursor-pointer" onClick={() => openUserView(user)}>
                      <TableCell className="max-w-0">
                        <div className="truncate font-medium">{user.display_name || "No name"}</div>
                        <div className="text-xs text-muted-foreground md:hidden truncate">{user.email || "—"}</div>
                        <div className="sm:hidden mt-1">
                          <Badge variant={user.status === "active" ? "default" : "secondary"} className="text-xs">
                            {user.status}
                          </Badge>
                        </div>
                        {user.role && user.role !== "user" && (
                          <Badge variant="destructive" className="mt-1 text-xs">
                            {user.role}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-0">
                        <span className="truncate block text-muted-foreground">{user.email || "—"}</span>
                      </TableCell>
                      <TableCell className={user.balance_usd === 0 ? "text-muted-foreground" : "text-green-600 font-medium"}>
                        ${user.balance_usd.toFixed(4)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={user.status === "active" ? "default" : "secondary"}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right p-1" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openUserView(user)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBalanceEdit(user)}>
                              <DollarSign className="mr-2 h-4 w-4" />
                              Edit Balance
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRoleChange(user.id, "admin")}>
                              <Shield className="mr-2 h-4 w-4" />
                              Make Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRoleChange(user.id, "moderator")}>
                              <Shield className="mr-2 h-4 w-4" />
                              Make Moderator
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRoleChange(user.id, "user")}>
                              <ShieldOff className="mr-2 h-4 w-4" />
                              Remove Role
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 sm:p-6">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Balance Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Balance</DialogTitle>
            <DialogDescription>
              {editingUser?.display_name || editingUser?.email} — current: ${editingUser?.balance_usd.toFixed(4)}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium">$</span>
              <Input
                type="number"
                step="0.0001"
                min="0"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBalanceSave()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={handleBalanceSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
