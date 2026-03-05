import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search, CreditCard } from "lucide-react";

// Extract category from endpoint like "/v1/model-inference/llm" → "llm"
const extractCategory = (endpoint: string): string => {
  const parts = endpoint.split("/");
  return parts[parts.length - 1] || endpoint;
};

interface UsageLog {
  id: string;
  user_id: string;
  endpoint: string;
  tokens_used: number;
  cost_usd: number;
  compute_time_ms: number;
  created_at: string;
  email?: string;
}

const ITEMS_PER_PAGE = 50;

export const AdminBilling = () => {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [profileMap, setProfileMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const fetchAggregates = async () => {
      const { data: costData } = await supabase
        .from("usage_logs")
        .select("cost_usd, tokens_used")
        .limit(100000);

      if (costData) {
        setTotalCost(costData.reduce((s, l) => s + Number(l.cost_usd), 0));
        setTotalTokens(costData.reduce((s, l) => s + Number(l.tokens_used), 0));
      }

      const { count } = await supabase
        .from("usage_logs")
        .select("*", { count: "exact", head: true });
      setTotalCount(count || 0);
    };

    const fetchProfiles = async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email");
      setProfileMap(new Map((profiles || []).map((p) => [p.user_id, p.email || ""])));
    };

    fetchAggregates();
    fetchProfiles();
  }, []);

  const fetchPage = useCallback(async (page: number, searchTerm: string) => {
    setLoading(true);
    try {
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, count, error } = await supabase
        .from("usage_logs")
        .select("id, user_id, endpoint, tokens_used, cost_usd, compute_time_ms, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const enriched = (data || []).map((log) => ({
        ...log,
        email: profileMap.get(log.user_id) || log.user_id.slice(0, 8) + "...",
      }));

      setLogs(enriched);
      if (count !== null) setTotalCount(count);
    } catch (e) {
      console.error("Error fetching billing logs:", e);
    } finally {
      setLoading(false);
    }
  }, [profileMap]);

  useEffect(() => {
    if (profileMap.size >= 0) {
      fetchPage(currentPage, search);
    }
  }, [currentPage, profileMap]);

  const handleSearch = (v: string) => {
    setSearch(v);
    setCurrentPage(1);
  };

  const filteredLogs = search
    ? logs.filter(
        (l) =>
          l.email?.toLowerCase().includes(search.toLowerCase()) ||
          l.endpoint.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchPage(newPage, search);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">All user charges across the platform</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Charged</p>
                <p className="text-2xl font-bold">${totalCost.toFixed(4)}</p>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Tokens</p>
              <p className="text-2xl font-bold">{totalTokens.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Records</p>
              <p className="text-2xl font-bold">{totalCount.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center gap-3">
          <CardTitle className="flex-1">Usage Charges</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or model..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile card list */}
          <div className="sm:hidden divide-y divide-border">
            {loading ? (
              <div className="py-10 flex justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">No records found</div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-sm font-medium truncate" title={log.email}>{log.email}</div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge variant="secondary" className="text-xs font-mono px-1.5 py-0">
                        {extractModel(log.endpoint)}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono truncate max-w-[160px]" title={log.endpoint}>{log.endpoint}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleDateString("ru-RU")}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{Number(log.tokens_used).toLocaleString()} tokens</span>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-destructive whitespace-nowrap shrink-0">
                    -${Number(log.cost_usd).toFixed(6)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop table */}
          <Table className="hidden sm:table">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Endpoint / Model</TableHead>
                <TableHead className="hidden lg:table-cell">Tokens</TableHead>
                <TableHead>Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No records found</TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      <div className="font-mono text-sm truncate" title={log.email}>{log.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Badge variant="secondary" className="font-mono text-xs w-fit">
                          {extractModel(log.endpoint)}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono" title={log.endpoint}>{log.endpoint}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{Number(log.tokens_used).toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-semibold text-destructive whitespace-nowrap">
                      -${Number(log.cost_usd).toFixed(6)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {totalCount.toLocaleString()} records · Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
