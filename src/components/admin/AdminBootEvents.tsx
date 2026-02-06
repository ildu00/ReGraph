import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, Search, AlertTriangle, Smartphone, Monitor, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface BootEvent {
  id: string;
  created_at: string;
  reason: string;
  url: string | null;
  user_agent: string | null;
  diag: Record<string, unknown> | null;
  storage_fallback: boolean;
  attempts: number;
  ip_address: string | null;
}

const ITEMS_PER_PAGE = 20;

export const AdminBootEvents = () => {
  const [events, setEvents] = useState<BootEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<BootEvent | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("boot_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setEvents((data as BootEvent[]) || []);
    } catch (error) {
      console.error("Failed to fetch boot events:", error);
      toast.error("Failed to load boot events");
    } finally {
      setLoading(false);
    }
  };

  const isMobile = (userAgent: string | null) => {
    if (!userAgent) return false;
    return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  };

  const getReasonBadge = (reason: string) => {
    const colors: Record<string, string> = {
      max_attempts: "bg-red-500/20 text-red-400 border-red-500/30",
      deadline: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      error: "bg-red-500/20 text-red-400 border-red-500/30",
      probe_error: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    };
    return colors[reason] || "bg-muted text-muted-foreground";
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, reasonFilter]);

  const filteredEvents = events.filter((event) => {
    const q = searchQuery.trim().toLowerCase();
    const terms = q.includes("|") ? q.split("|").map((t) => t.trim()).filter(Boolean) : (q ? [q] : []);

    const fields = [
      event.reason,
      event.url,
      event.user_agent,
      event.ip_address,
    ]
      .filter(Boolean)
      .map((v) => String(v).toLowerCase());

    const matchesSearch =
      terms.length === 0 ||
      terms.some((term) => fields.some((f) => f.includes(term)));

    const matchesReason = reasonFilter === "all" || event.reason === reasonFilter;

    return matchesSearch && matchesReason;
  });

  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE);
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const uniqueReasons = [...new Set(events.map((e) => e.reason))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  const mobileCount = events.filter((e) => isMobile(e.user_agent)).length;
  const storageFallbackCount = events.filter((e) => e.storage_fallback).length;
  const todayCount = events.filter((e) => new Date(e.created_at).toDateString() === new Date().toDateString()).length;

  const handleStatClick = (filter: string) => {
    if (filter === "mobile") {
      setSearchQuery("iPhone|iPad|Android");
    } else if (filter === "storage") {
      // Filter will show storage fallback events
      setReasonFilter("all");
      setSearchQuery("");
    } else if (filter === "today") {
      setSearchQuery("");
      setReasonFilter("all");
    } else {
      setSearchQuery("");
      setReasonFilter("all");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Boot Events</h1>
        <p className="text-muted-foreground">Monitor application boot failures and recovery attempts across devices</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card 
          className="bg-card border-border cursor-pointer transition-colors hover:border-primary/50"
          onClick={() => handleStatClick("all")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>
        <Card 
          className="bg-card border-border cursor-pointer transition-colors hover:border-orange-500/50"
          onClick={() => handleStatClick("mobile")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mobile Failures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">{mobileCount}</div>
          </CardContent>
        </Card>
        <Card 
          className="bg-card border-border cursor-pointer transition-colors hover:border-yellow-500/50"
          onClick={() => handleStatClick("storage")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Storage Fallback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{storageFallbackCount}</div>
          </CardContent>
        </Card>
        <Card 
          className="bg-card border-border cursor-pointer transition-colors hover:border-primary/50"
          onClick={() => handleStatClick("today")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{todayCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by reason, URL, user agent, IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={reasonFilter} onValueChange={setReasonFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by reason" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reasons</SelectItem>
              {uniqueReasons.map((reason) => (
                <SelectItem key={reason} value={reason}>
                  {reason}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchEvents} className="shrink-0 sm:gap-2 h-10 w-10 sm:w-auto p-0 sm:px-4">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Events Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0 overflow-x-hidden">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%] sm:w-[20%]">Time</TableHead>
                <TableHead className="w-[30%] sm:w-[20%]">Reason</TableHead>
                <TableHead className="hidden sm:table-cell w-[10%]">Device</TableHead>
                <TableHead className="hidden md:table-cell w-[10%]">Attempts</TableHead>
                <TableHead className="hidden lg:table-cell w-[10%]">Storage</TableHead>
                <TableHead className="hidden lg:table-cell w-[15%]">IP</TableHead>
                <TableHead className="w-[44px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No boot events found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEvents.map((event) => (
                  <TableRow key={event.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedEvent(event)}>
                    <TableCell className="text-sm">
                      <div>{format(new Date(event.created_at), "MMM d, HH:mm:ss")}</div>
                      <div className="flex items-center gap-2 sm:hidden mt-1">
                        {isMobile(event.user_agent) ? (
                          <Smartphone className="h-3 w-3 text-orange-400" />
                        ) : (
                          <Monitor className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">×{event.attempts}</span>
                        {event.storage_fallback && <AlertTriangle className="h-3 w-3 text-yellow-400" />}
                      </div>
                    </TableCell>
                    <TableCell className="truncate max-w-0">
                      <Badge variant="outline" className={`${getReasonBadge(event.reason)} truncate max-w-full`}>
                        {event.reason}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {isMobile(event.user_agent) ? (
                        <Smartphone className="h-4 w-4 text-orange-400" />
                      ) : (
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{event.attempts}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {event.storage_fallback ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                      {event.ip_address || "—"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">View</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredEvents.length)} of {filteredEvents.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
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

      {/* Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              Boot Event Details
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Time</div>
                  <div className="text-sm">{format(new Date(selectedEvent.created_at), "PPpp")}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Reason</div>
                  <Badge variant="outline" className={getReasonBadge(selectedEvent.reason)}>
                    {selectedEvent.reason}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Attempts</div>
                  <div className="text-sm">{selectedEvent.attempts}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Storage Fallback</div>
                  <div className="text-sm">{selectedEvent.storage_fallback ? "Yes" : "No"}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground uppercase">IP Address</div>
                  <div className="text-sm font-mono">{selectedEvent.ip_address || "—"}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground uppercase mb-1">URL</div>
                <pre className="p-2 rounded-lg bg-muted/30 text-xs overflow-auto max-h-20 whitespace-pre-wrap break-all">
                  {selectedEvent.url || "—"}
                </pre>
              </div>

              <div>
                <div className="text-xs text-muted-foreground uppercase mb-1">User Agent</div>
                <pre className="p-2 rounded-lg bg-muted/30 text-xs overflow-auto max-h-20 whitespace-pre-wrap break-all">
                  {selectedEvent.user_agent || "—"}
                </pre>
              </div>

              {selectedEvent.diag && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase mb-1">Diagnostic Data</div>
                  <pre className="p-2 rounded-lg bg-muted/30 text-xs overflow-auto max-h-40 whitespace-pre-wrap">
                    {JSON.stringify(selectedEvent.diag, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
