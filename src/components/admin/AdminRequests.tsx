import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, CheckCircle, Clock, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, User } from "lucide-react";
import { toast } from "sonner";

interface SupportRequest {
  id: string;
  name: string;
  email: string;
  message: string;
  subject: string;
  status: string;
  created_at: string;
  user_id: string | null;
  profile?: {
    display_name: string | null;
  } | null;
}

type SortField = "name" | "email" | "subject" | "status" | "created_at";
type SortOrder = "asc" | "desc";

export const AdminRequests = () => {
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "all");
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchRequests = async () => {
    try {
      // Fetch requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("support_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch profiles for user_ids
      const userIds = (requestsData || [])
        .map((r) => r.user_id)
        .filter((id): id is string => id !== null);

      let profilesMap: Record<string, string | null> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);

        profilesMap = (profilesData || []).reduce((acc, p) => {
          acc[p.user_id] = p.display_name;
          return acc;
        }, {} as Record<string, string | null>);
      }

      // Merge profile data into requests
      const enrichedRequests = (requestsData || []).map((r) => ({
        ...r,
        profile: r.user_id ? { display_name: profilesMap[r.user_id] || null } : null,
      }));

      setRequests(enrichedRequests as SupportRequest[]);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("support_requests")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Request marked as ${status}`);
      fetchRequests();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredAndSortedRequests = useMemo(() => {
    let result = [...requests];

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.email.toLowerCase().includes(query) ||
          r.subject?.toLowerCase().includes(query) ||
          r.message.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortField] || "";
      let bVal = b[sortField] || "";

      if (sortField === "created_at") {
        aVal = new Date(aVal).getTime().toString();
        bVal = new Date(bVal).getTime().toString();
      }

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [requests, statusFilter, searchQuery, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedRequests.length / itemsPerPage);
  const paginatedRequests = filteredAndSortedRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, itemsPerPage]);

  const SortableHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead
      className={`cursor-pointer hover:bg-muted/50 transition-colors ${className || ""}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortOrder === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return <Badge className="bg-green-500/10 text-green-500">Resolved</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500/10 text-blue-500">In Progress</Badge>;
      case "pending":
      default:
        return <Badge className="bg-amber-500/10 text-amber-500">Pending</Badge>;
    }
  };

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
        <h1 className="text-2xl font-bold">Support Requests</h1>
        <p className="text-muted-foreground">Manage incoming support and contact requests</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, subject, message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="25">25 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Requests ({filteredAndSortedRequests.length})
            {searchQuery && ` matching "${searchQuery}"`}
          </CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader field="name">From</SortableHeader>
                  <TableHead className="hidden lg:table-cell">Account</TableHead>
                  <SortableHeader field="subject" className="hidden sm:table-cell">Category</SortableHeader>
                  <TableHead className="hidden xl:table-cell">Message</TableHead>
                  <SortableHeader field="status">Status</SortableHeader>
                  <SortableHeader field="created_at" className="hidden md:table-cell">Date</SortableHeader>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium truncate">{request.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{request.email}</div>
                          <div className="sm:hidden mt-0.5">
                            <Badge variant="outline" className="text-xs">{request.subject || "General"}</Badge>
                          </div>
                          <div className="lg:hidden mt-1">
                            {request.user_id ? (
                              <span className="text-xs text-primary flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {request.profile?.display_name || "User"}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Guest</span>
                            )}
                          </div>
                          <div className="md:hidden text-xs text-muted-foreground mt-0.5">
                            {new Date(request.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {request.user_id ? (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-primary" />
                            <span className="text-sm">
                              {request.profile?.display_name || "User"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Guest</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">{request.subject || "General"}</Badge>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell max-w-[200px] truncate">
                        {request.message}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                        {new Date(request.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hidden sm:inline-flex"
                            onClick={() => updateStatus(request.id, "in_progress")}
                          >
                            <Clock className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hidden sm:inline-flex"
                            onClick={() => updateStatus(request.id, "resolved")}
                          >
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredAndSortedRequests.length)} of{" "}
                {filteredAndSortedRequests.length} requests
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="font-medium">{selectedRequest.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="font-medium">{selectedRequest.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Account</label>
                  <p className="font-medium flex items-center gap-1.5">
                    {selectedRequest.user_id ? (
                      <>
                        <User className="h-4 w-4 text-primary" />
                        {selectedRequest.profile?.display_name || "Registered User"}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Guest (not logged in)</span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Subject</label>
                  <p className="font-medium">{selectedRequest.subject || "General"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Message</label>
                <p className="mt-1 rounded-lg bg-muted p-4">{selectedRequest.message}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => updateStatus(selectedRequest.id, "in_progress")}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Mark In Progress
                </Button>
                <Button
                  onClick={() => {
                    updateStatus(selectedRequest.id, "resolved");
                    setSelectedRequest(null);
                  }}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark Resolved
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
