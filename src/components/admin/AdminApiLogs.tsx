import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, RefreshCw, Activity } from "lucide-react";

interface ApiRequestLog {
  id: string;
  method: string;
  endpoint: string;
  status_code: number;
  response_time_ms: number;
  user_agent: string | null;
  ip_address: string | null;
  api_key_prefix: string | null;
  error_message: string | null;
  request_body: string | null;
  created_at: string;
}

const PAGE_SIZE = 20;

const methodColor = (method: string) => {
  switch (method.toUpperCase()) {
    case "GET": return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "POST": return "bg-green-500/15 text-green-400 border-green-500/30";
    case "PUT": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "DELETE": return "bg-red-500/15 text-red-400 border-red-500/30";
    default: return "bg-muted text-muted-foreground";
  }
};

const statusColor = (code: number) => {
  if (code < 300) return "text-green-400";
  if (code < 400) return "text-amber-400";
  if (code < 500) return "text-orange-400";
  return "text-red-400";
};

export const AdminApiLogs = () => {
  const [logs, setLogs] = useState<ApiRequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [endpointFilter, setEndpointFilter] = useState<string>("all");
  const [endpoints, setEndpoints] = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState<ApiRequestLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("api_request_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (methodFilter !== "all") {
        query = query.eq("method", methodFilter);
      }
      if (endpointFilter !== "all") {
        query = query.eq("endpoint", endpointFilter);
      }

      const { data, count, error } = await query;

      if (error) {
        console.error("Error fetching API logs:", error);
        return;
      }

      setLogs((data as ApiRequestLog[]) || []);
      setTotalCount(count || 0);
    } finally {
      setLoading(false);
    }
  }, [page, methodFilter, endpointFilter]);

  // Fetch distinct endpoints for filter
  useEffect(() => {
    const fetchEndpoints = async () => {
      const { data } = await supabase
        .from("api_request_logs")
        .select("endpoint")
        .order("endpoint");
      
      if (data) {
        const unique = [...new Set(data.map((d: { endpoint: string }) => d.endpoint))];
        setEndpoints(unique);
      }
    };
    fetchEndpoints();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">API Logs</h1>
          <p className="text-muted-foreground">
            {totalCount} total requests
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLogs()}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>

        <Select value={endpointFilter} onValueChange={(v) => { setEndpointFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Endpoint" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Endpoints</SelectItem>
            {endpoints.map((ep) => (
              <SelectItem key={ep} value={ep}>{ep}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Activity className="h-10 w-10 mb-3 opacity-40" />
              <p>No API requests logged yet</p>
              <p className="text-sm mt-1">Requests to api.regraph.tech will appear here</p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">Method</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead className="hidden lg:table-cell">Request Body</TableHead>
                    <TableHead className="w-[60px]">Status</TableHead>
                    <TableHead className="w-[60px] hidden md:table-cell">Time</TableHead>
                    <TableHead className="w-[90px] hidden xl:table-cell">API Key</TableHead>
                    <TableHead className="w-[100px] hidden xl:table-cell">IP</TableHead>
                    <TableHead className="w-[150px] hidden sm:table-cell">Date & Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLog(log)}>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs font-mono ${methodColor(log.method)}`}>
                          {log.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs truncate max-w-[200px]" title={log.endpoint}>
                        {log.endpoint}
                        <div className="sm:hidden text-[10px] text-muted-foreground font-sans mt-0.5">
                          {formatTime(log.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-[250px]">
                        <span className="text-xs text-muted-foreground truncate block">
                          {log.request_body ? log.request_body.substring(0, 100) + (log.request_body.length > 100 ? "…" : "") : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-mono text-xs font-semibold ${statusColor(log.status_code)}`}>
                          {log.status_code}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {log.response_time_ms}ms
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs font-mono text-muted-foreground truncate max-w-[90px]">
                        {log.api_key_prefix || "—"}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                        {log.ip_address || "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(log.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Method</p>
                  <Badge variant="outline" className={`text-xs font-mono ${methodColor(selectedLog.method)}`}>
                    {selectedLog.method}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <span className={`font-mono text-sm font-semibold ${statusColor(selectedLog.status_code)}`}>
                    {selectedLog.status_code}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Endpoint</p>
                  <p className="font-mono text-sm break-all">{selectedLog.endpoint}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Response Time</p>
                  <p className="text-sm">{selectedLog.response_time_ms}ms</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date & Time</p>
                  <p className="text-sm">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">API Key</p>
                  <p className="font-mono text-sm">{selectedLog.api_key_prefix || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IP Address</p>
                  <p className="text-sm">{selectedLog.ip_address || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User Agent</p>
                  <p className="text-sm truncate">{selectedLog.user_agent || "—"}</p>
                </div>
              </div>
              {selectedLog.request_body && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Request Body</p>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-48 whitespace-pre-wrap break-all">
                    {selectedLog.request_body}
                  </pre>
                </div>
              )}
              {selectedLog.error_message && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Error</p>
                  <pre className="bg-destructive/10 text-destructive p-3 rounded-md text-xs overflow-auto max-h-32 whitespace-pre-wrap break-all">
                    {selectedLog.error_message}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
