import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, Search, AlertTriangle, Smartphone, Monitor, Loader2 } from "lucide-react";
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

export const AdminBootEvents = () => {
  const [events, setEvents] = useState<BootEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<BootEvent | null>(null);

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

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      searchQuery === "" ||
      event.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.url?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.user_agent?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.ip_address?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesReason = reasonFilter === "all" || event.reason === reasonFilter;

    return matchesSearch && matchesReason;
  });

  const uniqueReasons = [...new Set(events.map((e) => e.reason))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mobile Failures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">
              {events.filter((e) => isMobile(e.user_agent)).length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Storage Fallback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">
              {events.filter((e) => e.storage_fallback).length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {events.filter((e) => new Date(e.created_at).toDateString() === new Date().toDateString()).length}
            </div>
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
        <Select value={reasonFilter} onValueChange={setReasonFilter}>
          <SelectTrigger className="w-[180px]">
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
        <Button variant="outline" onClick={fetchEvents} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Events Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Storage</TableHead>
                <TableHead>IP</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No boot events found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.slice(0, 100).map((event) => (
                  <TableRow key={event.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedEvent(event)}>
                    <TableCell className="text-sm">
                      {format(new Date(event.created_at), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getReasonBadge(event.reason)}>
                        {event.reason}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isMobile(event.user_agent) ? (
                        <Smartphone className="h-4 w-4 text-orange-400" />
                      ) : (
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>{event.attempts}</TableCell>
                    <TableCell>
                      {event.storage_fallback ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
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
