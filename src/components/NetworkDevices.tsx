import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, Cpu, Server, Smartphone, Monitor, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Device {
  id: string;
  name: string;
  model: string | null;
  type: string;
  vram_gb: number | null;
  price_per_hour: number;
  status: string;
  last_seen_at: string | null;
  total_compute_hours: number;
}

interface DevicesResponse {
  devices: Device[];
  total: number;
  limit: number;
  offset: number;
  stats: {
    online: number;
    offline: number;
    pending: number;
    maintenance: number;
  };
}

type SortField = "name" | "type" | "vram_gb" | "price_per_hour" | "status" | "total_compute_hours";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

const getDeviceIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case "gpu":
      return <Monitor className="w-4 h-4" />;
    case "cpu":
      return <Cpu className="w-4 h-4" />;
    case "smartphone":
      return <Smartphone className="w-4 h-4" />;
    default:
      return <Server className="w-4 h-4" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "online":
      return <Badge variant="outline" className="border-green-500/30 text-green-500 bg-green-500/10">Online</Badge>;
    case "offline":
      return <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">Offline</Badge>;
    case "maintenance":
      return <Badge variant="outline" className="border-yellow-500/30 text-yellow-500 bg-yellow-500/10">Maintenance</Badge>;
    case "pending":
      return <Badge variant="outline" className="border-blue-500/30 text-blue-500 bg-blue-500/10">Pending</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const NetworkDevices = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    fetchDevices();
  }, [page, statusFilter, typeFilter]);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const params = new URLSearchParams({
        limit: "200",
        offset: "0",
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);

      const res = await fetch(`${supabaseUrl}/functions/v1/devices?${params}`);
      if (!res.ok) throw new Error("Failed to fetch devices");
      const data: DevicesResponse = await res.json();
      setDevices(data.devices);
      setTotal(data.total);
    } catch (e) {
      console.error("Error fetching devices:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 ml-1" />
      : <ChevronDown className="w-3 h-3 ml-1" />;
  };

  const filtered = useMemo(() => {
    let list = [...devices];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.model && d.model.toLowerCase().includes(q)) ||
        d.type.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "type":
          cmp = a.type.localeCompare(b.type);
          break;
        case "vram_gb":
          cmp = (a.vram_gb ?? 0) - (b.vram_gb ?? 0);
          break;
        case "price_per_hour":
          cmp = a.price_per_hour - b.price_per_hour;
          break;
        case "status": {
          const order: Record<string, number> = { online: 0, maintenance: 1, pending: 2, offline: 3 };
          cmp = (order[a.status] ?? 9) - (order[b.status] ?? 9);
          break;
        }
        case "total_compute_hours":
          cmp = a.total_compute_hours - b.total_compute_hours;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [devices, search, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, typeFilter, sortField, sortDir]);

  const formatHours = (h: number) => {
    if (h >= 1000) return `${(h / 1000).toFixed(1)}K`;
    return h.toFixed(1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="p-6 rounded-xl border border-border bg-card mb-12"
    >
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Server className="w-5 h-5" />
        Network Devices
        <span className="text-sm font-normal text-muted-foreground ml-2">
          ({total} total)
        </span>
      </h2>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, model, or type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="gpu">GPU</SelectItem>
            <SelectItem value="cpu">CPU</SelectItem>
            <SelectItem value="npu">NPU</SelectItem>
            <SelectItem value="tpu">TPU</SelectItem>
            <SelectItem value="smartphone">Smartphone</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          Loading devices...
        </div>
      ) : paged.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Filter className="w-8 h-8 mb-3 opacity-40" />
          <p>No devices match your filters</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button onClick={() => handleSort("status")} className="flex items-center hover:text-foreground transition-colors">
                      Status <SortIcon field="status" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort("name")} className="flex items-center hover:text-foreground transition-colors">
                      Device <SortIcon field="name" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort("type")} className="flex items-center hover:text-foreground transition-colors">
                      Type <SortIcon field="type" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort("vram_gb")} className="flex items-center hover:text-foreground transition-colors">
                      VRAM <SortIcon field="vram_gb" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort("price_per_hour")} className="flex items-center hover:text-foreground transition-colors">
                      Price/hr <SortIcon field="price_per_hour" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort("total_compute_hours")} className="flex items-center hover:text-foreground transition-colors">
                      Compute Hours <SortIcon field="total_compute_hours" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(device => (
                  <TableRow key={device.id}>
                    <TableCell>{getStatusBadge(device.status)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{device.name}</p>
                        {device.model && (
                          <p className="text-xs text-muted-foreground">{device.model}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {getDeviceIcon(device.type)}
                        <span className="text-sm uppercase">{device.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {device.vram_gb ? `${device.vram_gb} GB` : "—"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      ${device.price_per_hour.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatHours(device.total_compute_hours)}h
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {paged.map(device => (
              <div key={device.id} className="p-4 rounded-lg bg-muted/30 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getDeviceIcon(device.type)}
                    <span className="font-medium text-sm">{device.name}</span>
                  </div>
                  {getStatusBadge(device.status)}
                </div>
                {device.model && (
                  <p className="text-xs text-muted-foreground">{device.model}</p>
                )}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Type</span>
                    <p className="font-medium uppercase">{device.type}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">VRAM</span>
                    <p className="font-medium">{device.vram_gb ? `${device.vram_gb} GB` : "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Price/hr</span>
                    <p className="font-medium">${device.price_per_hour.toFixed(4)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default NetworkDevices;
