import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Key, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  user_id: string;
  user_email?: string;
}

export const AdminApiKeys = () => {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, name, key_prefix, is_active, created_at, last_used_at, user_id")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching API keys:", error);
        setKeys([]);
        return;
      }

      // Fetch profiles to map user_id -> email
      const userIds = [...new Set((data || []).map((k) => k.user_id))];
      let emailMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email")
          .in("user_id", userIds);

        if (profiles) {
          for (const p of profiles) {
            if (p.email) emailMap[p.user_id] = p.email;
          }
        }
      }

      setKeys(
        (data || []).map((k) => ({
          ...k,
          user_email: emailMap[k.user_id] || k.user_id,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6 text-primary" />
            API Keys
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            All API keys created by users across the platform
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchKeys} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No API keys found.</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key Prefix</TableHead>
                <TableHead className="hidden sm:table-cell">User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead className="hidden lg:table-cell">Last Used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{key.key_prefix}...</code>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-xs max-w-[200px] truncate">
                    {key.user_email}
                  </TableCell>
                  <TableCell>
                    <Badge variant={key.is_active ? "default" : "secondary"}>
                      {key.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                    {format(new Date(key.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                    {key.last_used_at
                      ? format(new Date(key.last_used_at), "MMM d, yyyy HH:mm")
                      : "Never"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Total: {keys.length} key{keys.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
};
