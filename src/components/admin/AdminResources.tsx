import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Server, Cpu, HardDrive, Wifi, WifiOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Device {
  id: string;
  device_name: string;
  device_type: string;
  device_model: string | null;
  status: string;
  vram_gb: number | null;
  price_per_hour: number;
  total_earnings: number;
  total_compute_hours: number;
  created_at: string;
  last_seen_at: string | null;
  user_id: string;
}

const DEVICE_TYPES = ["gpu", "cpu", "tpu", "npu", "smartphone"] as const;
const DEVICE_STATUSES = ["pending", "online", "offline", "maintenance"] as const;

export const AdminResources = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDeviceId, setDeleteDeviceId] = useState<string | null>(null);
  const [newDevice, setNewDevice] = useState({
    device_name: "",
    device_type: "gpu" as typeof DEVICE_TYPES[number],
    device_model: "",
    vram_gb: "",
    price_per_hour: "0.10",
    status: "pending" as typeof DEVICE_STATUSES[number],
  });

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

  useEffect(() => {
    fetchDevices();
  }, []);

  const addDevice = async () => {
    if (!newDevice.device_name.trim()) {
      toast.error("Device name is required");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      const { error } = await supabase.from("provider_devices").insert({
        device_name: newDevice.device_name,
        device_type: newDevice.device_type,
        device_model: newDevice.device_model || null,
        vram_gb: newDevice.vram_gb ? parseInt(newDevice.vram_gb) : null,
        price_per_hour: parseFloat(newDevice.price_per_hour) || 0.10,
        status: newDevice.status,
        user_id: user.id,
      });

      if (error) throw error;

      toast.success("Device added successfully");
      setIsDialogOpen(false);
      setNewDevice({
        device_name: "",
        device_type: "gpu",
        device_model: "",
        vram_gb: "",
        price_per_hour: "0.10",
        status: "pending",
      });
      fetchDevices();
    } catch (error) {
      console.error("Error adding device:", error);
      toast.error("Failed to add device");
    }
  };

  const deleteDevice = async (id: string) => {
    try {
      const { error } = await supabase
        .from("provider_devices")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Device deleted");
      setDevices(devices.filter((d) => d.id !== id));
    } catch (error) {
      console.error("Error deleting device:", error);
      toast.error("Failed to delete device");
    } finally {
      setDeleteDeviceId(null);
    }
  };

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
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Resource Management</h1>
          <p className="text-muted-foreground">Monitor and manage provider devices</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="sm:w-auto sm:px-4">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Device</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Device</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Device Name *</Label>
                <Input
                  value={newDevice.device_name}
                  onChange={(e) => setNewDevice({ ...newDevice, device_name: e.target.value })}
                  placeholder="e.g., RTX 4090 #1"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Device Type</Label>
                  <Select
                    value={newDevice.device_type}
                    onValueChange={(v) => setNewDevice({ ...newDevice, device_type: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEVICE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={newDevice.status}
                    onValueChange={(v) => setNewDevice({ ...newDevice, status: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEVICE_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Device Model</Label>
                <Input
                  value={newDevice.device_model}
                  onChange={(e) => setNewDevice({ ...newDevice, device_model: e.target.value })}
                  placeholder="e.g., NVIDIA GeForce RTX 4090"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>VRAM (GB)</Label>
                  <Input
                    type="number"
                    value={newDevice.vram_gb}
                    onChange={(e) => setNewDevice({ ...newDevice, vram_gb: e.target.value })}
                    placeholder="e.g., 24"
                  />
                </div>
                <div>
                  <Label>Price per Hour ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newDevice.price_per_hour}
                    onChange={(e) => setNewDevice({ ...newDevice, price_per_hour: e.target.value })}
                    placeholder="0.10"
                  />
                </div>
              </div>
              <Button onClick={addDevice} className="w-full">
                Add Device
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                <SelectItem value="pending">Pending</SelectItem>
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
                  <TableHead>VRAM</TableHead>
                  <TableHead>Price/hr</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
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
                      {device.vram_gb ? `${device.vram_gb} GB` : "-"}
                    </TableCell>
                    <TableCell>${Number(device.price_per_hour).toFixed(2)}</TableCell>
                    <TableCell>${Number(device.total_earnings).toFixed(2)}</TableCell>
                    <TableCell>
                      {device.last_seen_at
                        ? new Date(device.last_seen_at).toLocaleString()
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteDeviceId(device.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDeviceId} onOpenChange={() => setDeleteDeviceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this device? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDeviceId && deleteDevice(deleteDeviceId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
