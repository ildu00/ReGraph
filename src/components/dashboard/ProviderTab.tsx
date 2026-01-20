import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Cpu,
  Server,
  Smartphone,
  Trash2,
  Copy,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import CodeBlock from "@/components/CodeBlock";

type DeviceType = "gpu" | "tpu" | "npu" | "cpu" | "smartphone";
type DeviceStatus = "pending" | "online" | "offline" | "maintenance";

interface ProviderProfile {
  id: string;
  company_name: string | null;
  payout_address: string | null;
  total_earnings: number;
  is_verified: boolean;
}

interface Device {
  id: string;
  device_name: string;
  device_type: DeviceType;
  device_model: string | null;
  vram_gb: number | null;
  price_per_hour: number;
  status: DeviceStatus;
  connection_key: string | null;
  total_compute_hours: number;
  total_earnings: number;
  created_at: string;
}

const deviceTypeIcons: Record<DeviceType, React.ElementType> = {
  gpu: Zap,
  tpu: Cpu,
  npu: Cpu,
  cpu: Server,
  smartphone: Smartphone,
};

const statusColors: Record<DeviceStatus, string> = {
  pending: "text-yellow-500",
  online: "text-green-500",
  offline: "text-muted-foreground",
  maintenance: "text-orange-500",
};

const ProviderTab = () => {
  const { user } = useAuth();
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [isAddingDevice, setIsAddingDevice] = useState(false);

  // New device form
  const [newDevice, setNewDevice] = useState({
    device_name: "",
    device_type: "gpu" as DeviceType,
    device_model: "",
    vram_gb: "",
    price_per_hour: "0.10",
  });

  useEffect(() => {
    fetchProviderData();
  }, [user]);

  const fetchProviderData = async () => {
    if (!user) return;

    // Fetch provider profile
    const { data: profile } = await supabase
      .from("provider_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    setProviderProfile(profile);

    // Fetch devices
    const { data: deviceData } = await supabase
      .from("provider_devices")
      .select("*")
      .order("created_at", { ascending: false });

    setDevices((deviceData as Device[]) || []);
    setLoading(false);
  };

  const registerAsProvider = async () => {
    if (!user) return;
    setIsRegistering(true);

    const { error } = await supabase.from("provider_profiles").insert({
      user_id: user.id,
    });

    if (error) {
      toast.error("Failed to register as provider");
    } else {
      toast.success("Successfully registered as provider!");
      fetchProviderData();
    }
    setIsRegistering(false);
  };

  const generateConnectionKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "rgc_";
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const addDevice = async () => {
    if (!user || !newDevice.device_name.trim()) return;
    setIsAddingDevice(true);

    const connectionKey = generateConnectionKey();

    const { error } = await supabase.from("provider_devices").insert({
      user_id: user.id,
      device_name: newDevice.device_name.trim(),
      device_type: newDevice.device_type,
      device_model: newDevice.device_model.trim() || null,
      vram_gb: newDevice.vram_gb ? parseInt(newDevice.vram_gb) : null,
      price_per_hour: parseFloat(newDevice.price_per_hour),
      connection_key: connectionKey,
    });

    if (error) {
      toast.error("Failed to add device");
    } else {
      toast.success("Device added successfully!");
      setNewDevice({
        device_name: "",
        device_type: "gpu",
        device_model: "",
        vram_gb: "",
        price_per_hour: "0.10",
      });
      setIsAddDeviceOpen(false);
      fetchProviderData();
    }
    setIsAddingDevice(false);
  };

  const deleteDevice = async (id: string) => {
    const { error } = await supabase.from("provider_devices").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete device");
    } else {
      setDevices(devices.filter((d) => d.id !== id));
      toast.success("Device deleted");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  // Not registered as provider yet
  if (!providerProfile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Become a Provider</h1>
          <p className="text-muted-foreground">
            Share your compute resources and earn from the network.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Server className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Monetize Your Hardware</h2>
          <p className="text-muted-foreground mb-6">
            Connect your GPUs, TPUs, NPUs, or even smartphones to the ReGraph network.
            Earn credits for every inference task completed on your devices.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-secondary/50 rounded-lg">
              <DollarSign className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-medium">Competitive Rates</p>
              <p className="text-sm text-muted-foreground">Set your own pricing</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg">
              <Zap className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-medium">Easy Setup</p>
              <p className="text-sm text-muted-foreground">One-line install</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg">
              <Clock className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-medium">24/7 Earnings</p>
              <p className="text-sm text-muted-foreground">Passive income</p>
            </div>
          </div>

          <Button onClick={registerAsProvider} disabled={isRegistering} className="glow-primary">
            {isRegistering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Register as Provider
          </Button>
        </div>
      </div>
    );
  }

  // Provider dashboard
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Provider Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your devices and track earnings.
          </p>
        </div>
        <Dialog open={isAddDeviceOpen} onOpenChange={setIsAddDeviceOpen}>
          <DialogTrigger asChild>
            <Button
              size="icon"
              className="glow-primary rounded-none aspect-square h-10 w-10 md:hidden"
              aria-label="Add Device"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogTrigger asChild>
            <Button className="glow-primary hidden md:inline-flex" aria-label="Add Device">
              <Plus className="mr-2 h-4 w-4" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Add New Device</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deviceName">Device Name</Label>
                <Input
                  id="deviceName"
                  placeholder="e.g., My RTX 4090"
                  value={newDevice.device_name}
                  onChange={(e) =>
                    setNewDevice({ ...newDevice, device_name: e.target.value })
                  }
                  className="bg-secondary border-border"
                />
              </div>

              <div className="space-y-2">
                <Label>Device Type</Label>
                <Select
                  value={newDevice.device_type}
                  onValueChange={(value: DeviceType) =>
                    setNewDevice({ ...newDevice, device_type: value })
                  }
                >
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpu">GPU</SelectItem>
                    <SelectItem value="tpu">TPU</SelectItem>
                    <SelectItem value="npu">NPU</SelectItem>
                    <SelectItem value="cpu">CPU</SelectItem>
                    <SelectItem value="smartphone">Smartphone</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deviceModel">Model (optional)</Label>
                <Input
                  id="deviceModel"
                  placeholder="e.g., NVIDIA RTX 4090"
                  value={newDevice.device_model}
                  onChange={(e) =>
                    setNewDevice({ ...newDevice, device_model: e.target.value })
                  }
                  className="bg-secondary border-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vram">VRAM (GB)</Label>
                  <Input
                    id="vram"
                    type="number"
                    placeholder="24"
                    value={newDevice.vram_gb}
                    onChange={(e) =>
                      setNewDevice({ ...newDevice, vram_gb: e.target.value })
                    }
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price/Hour ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={newDevice.price_per_hour}
                    onChange={(e) =>
                      setNewDevice({ ...newDevice, price_per_hour: e.target.value })
                    }
                    className="bg-secondary border-border"
                  />
                </div>
              </div>

              <Button
                onClick={addDevice}
                disabled={!newDevice.device_name.trim() || isAddingDevice}
                className="w-full glow-primary"
              >
                {isAddingDevice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Device
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <p className="text-sm text-muted-foreground mb-1">Total Devices</p>
          <p className="text-3xl font-bold">{devices.length}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <p className="text-sm text-muted-foreground mb-1">Online Devices</p>
          <p className="text-3xl font-bold">
            {devices.filter((d) => d.status === "online").length}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
          <p className="text-3xl font-bold">
            ${providerProfile.total_earnings.toFixed(2)}
          </p>
        </motion.div>
      </div>

      {/* Devices List */}
      {devices.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Devices Yet</h3>
          <p className="text-muted-foreground mb-4">
            Add your first device to start earning from the network.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your Devices</h2>
          <AnimatePresence>
            {devices.map((device) => {
              const Icon = deviceTypeIcons[device.device_type];
              return (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-card border border-border rounded-xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{device.device_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {device.device_model || device.device_type.toUpperCase()}
                          {device.vram_gb && ` • ${device.vram_gb}GB VRAM`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 text-sm ${statusColors[device.status]}`}>
                        {device.status === "online" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : device.status === "pending" ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                      </span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Device</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{device.device_name}"? This action cannot be undone and the device will be removed from the network.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteDevice(device.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Price/Hour</p>
                      <p className="font-medium">${Number(device.price_per_hour).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Compute Hours</p>
                      <p className="font-medium">{Number(device.total_compute_hours).toFixed(1)}h</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Earnings</p>
                      <p className="font-medium">${Number(device.total_earnings).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Added</p>
                      <p className="font-medium">
                        {new Date(device.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {device.connection_key && (
                    <div className="p-4 bg-secondary/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">
                        Connection Key (use this to connect your device)
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm font-mono bg-background px-3 py-2 rounded border border-border truncate">
                          {device.connection_key}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(device.connection_key!)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Installation Instructions */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Setup</h2>
        <p className="text-muted-foreground mb-4">
          Install the ReGraph agent on your device to start receiving tasks:
        </p>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Linux / macOS:</p>
            <CodeBlock code="curl -sSL https://regraph.tech/scripts/install.sh | bash" language="bash" />
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Docker (quick start):</p>
            <CodeBlock 
              code={`docker run -d --gpus all \\
  -e REGRAPH_KEY=YOUR_CONNECTION_KEY \\
  regraph/agent:latest`} 
              language="bash" 
            />
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Docker Compose (recommended for production):</p>
            <CodeBlock 
              code={`# Download docker-compose.yml
curl -O https://regraph.tech/scripts/docker-compose.yml

# Set your connection key
export REGRAPH_KEY=YOUR_CONNECTION_KEY

# Start the agent
docker-compose up -d`} 
              language="bash" 
            />
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Windows (PowerShell):</p>
            <CodeBlock code="irm https://regraph.tech/scripts/install.ps1 | iex" language="powershell" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderTab;
