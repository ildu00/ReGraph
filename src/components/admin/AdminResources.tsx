import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Server, Cpu, HardDrive, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

interface Device {
  id: string;
  device_name: string;
  device_type: string;
  status: string;
  vram_gb: number | null;
  ram_gb: number | null;
  storage_gb: number | null;
  created_at: string;
  last_seen_at: string | null;
  provider_id: string;
}

export const AdminResources = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const { data, error } = await supabase
          .from("provider_devices")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setDevices(data || []);
      } catch (error) {
        console.error("Error fetching devices:", error);
        toast.error("Failed to fetch devices");
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  const filteredDevices = devices.filter((device) => {
    const matchesStatus = statusFilter === "all" || device.status === statusFilter;
    const matchesType = typeFilter === "all" || device.device_type === typeFilter;
    return matchesStatus && matchesType;
  });

  const deviceTypes = [...new Set(devices.map((d) => d.device_type))];

  const stats = {
    total: devices.length,
    online: devices.filter((d) => d.status === "online").length,
    offline: devices.filter((d) => d.status === "offline").length,
    maintenance: devices.filter((d) => d.status === "maintenance").length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return <Badge className="bg-green-500/10 text-green-500"><Wifi className="mr-1 h-3 w-3" />Online</Badge>;
      case "offline":
        return <Badge className="bg-red-500/10 text-red-500"><WifiOff className="mr-1 h-3 w-3" />Offline</Badge>;
      case "maintenance":
        return <Badge className="bg-amber-500/10 text-amber-500">Maintenance</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Resource Management</h1>
        <p className="text-muted-foreground">Monitor and manage provider devices</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Server className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Devices</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Wifi className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Online</p>
                <p className="text-2xl font-bold">{stats.online}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <WifiOff className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Offline</p>
                <p className="text-2xl font-bold">{stats.offline}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <HardDrive className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-sm text-muted-foreground">Maintenance</p>
                <p className="text-2xl font-bold">{stats.maintenance}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {deviceTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Devices ({filteredDevices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Compute</TableHead>
                  <TableHead>Memory</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>
                      <div className="font-medium">{device.device_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {device.id.slice(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{device.device_type?.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(device.status)}</TableCell>
                    <TableCell>
                      {device.vram_gb ? `${device.vram_gb} GB VRAM` : "-"}
                    </TableCell>
                    <TableCell>
                      {device.ram_gb ? `${device.ram_gb} GB` : "-"}
                    </TableCell>
                    <TableCell>
                      {device.storage_gb ? `${device.storage_gb} GB` : "-"}
                    </TableCell>
                    <TableCell>
                      {device.last_seen_at
                        ? new Date(device.last_seen_at).toLocaleString()
                        : "Never"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
