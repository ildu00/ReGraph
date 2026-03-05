import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Copy, Wallet } from "lucide-react";

interface ProjectWallet {
  id: string;
  network: string;
  address: string;
  label: string;
  currency: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

const NETWORKS = [
  { value: "ethereum", label: "Ethereum", icon: "⟠" },
  { value: "polygon", label: "Polygon", icon: "⬡" },
  { value: "bsc", label: "BNB Chain", icon: "◆" },
  { value: "arbitrum", label: "Arbitrum", icon: "◈" },
  { value: "optimism", label: "Optimism", icon: "○" },
  { value: "solana", label: "Solana", icon: "◎" },
  { value: "bitcoin", label: "Bitcoin", icon: "₿" },
  { value: "tron", label: "Tron", icon: "◉" },
];

const CURRENCIES: Record<string, string[]> = {
  ethereum: ["ETH", "USDT", "USDC"],
  polygon: ["MATIC", "USDT", "USDC"],
  bsc: ["BNB", "USDT", "USDC"],
  arbitrum: ["ETH", "USDT", "USDC"],
  optimism: ["ETH", "USDT", "USDC"],
  solana: ["SOL", "USDT", "USDC"],
  bitcoin: ["BTC"],
  tron: ["TRX", "USDT"],
};

const emptyForm = {
  network: "ethereum",
  address: "",
  label: "",
  currency: "USDT",
  notes: "",
  is_active: true,
};

export const AdminProjectWallets = () => {
  const [wallets, setWallets] = useState<ProjectWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<ProjectWallet | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_wallets" as any)
      .select("*")
      .order("network", { ascending: true });
    if (error) {
      toast.error("Failed to load project wallets");
    } else {
      setWallets((data as unknown as ProjectWallet[]) || []);
    }
    setLoading(false);
  };

  const openAdd = () => {
    setEditingWallet(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (w: ProjectWallet) => {
    setEditingWallet(w);
    setForm({
      network: w.network,
      address: w.address,
      label: w.label,
      currency: w.currency,
      notes: w.notes || "",
      is_active: w.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.address.trim()) {
      toast.error("Address is required");
      return;
    }
    if (!form.label.trim()) {
      toast.error("Label is required");
      return;
    }

    setSaving(true);
    try {
      if (editingWallet) {
        const { error } = await supabase
          .from("project_wallets" as any)
          .update({
            network: form.network,
            address: form.address.trim(),
            label: form.label.trim(),
            currency: form.currency,
            notes: form.notes,
            is_active: form.is_active,
          })
          .eq("id", editingWallet.id);
        if (error) throw error;
        toast.success("Wallet updated");
      } else {
        const { error } = await supabase
          .from("project_wallets" as any)
          .insert({
            network: form.network,
            address: form.address.trim(),
            label: form.label.trim(),
            currency: form.currency,
            notes: form.notes,
            is_active: form.is_active,
          });
        if (error) throw error;
        toast.success("Wallet added");
      }
      setDialogOpen(false);
      fetchWallets();
    } catch (err: any) {
      toast.error(err.message || "Failed to save wallet");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this wallet address?")) return;
    const { error } = await supabase
      .from("project_wallets" as any)
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Wallet deleted");
      fetchWallets();
    }
  };

  const toggleActive = async (wallet: ProjectWallet) => {
    const { error } = await supabase
      .from("project_wallets" as any)
      .update({ is_active: !wallet.is_active })
      .eq("id", wallet.id);
    if (error) {
      toast.error("Failed to update");
    } else {
      fetchWallets();
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied");
  };

  const getNetworkInfo = (network: string) =>
    NETWORKS.find((n) => n.value === network) || { label: network, icon: "◉" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Project Wallets</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Centralized deposit addresses shown to users for crypto top-ups
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Wallet
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Deposit Addresses
          </CardTitle>
          <CardDescription>
            These addresses will be displayed to users in the Deposit Crypto dialog
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            </div>
          ) : wallets.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Wallet className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No project wallets configured yet</p>
              <p className="text-sm mt-1">Add wallet addresses to enable crypto deposits</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Network</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallets.map((w) => {
                    const net = getNetworkInfo(w.network);
                    return (
                      <TableRow key={w.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{net.icon}</span>
                            <span className="font-medium text-sm">{net.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{w.label}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 max-w-[220px]">
                            <code className="text-xs font-mono truncate text-muted-foreground">
                              {w.address}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0"
                              onClick={() => copyAddress(w.address)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{w.currency}</Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={w.is_active}
                            onCheckedChange={() => toggleActive(w)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openEdit(w)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(w.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingWallet ? "Edit Wallet" : "Add Wallet Address"}</DialogTitle>
            <DialogDescription>
              Configure a project wallet address for receiving crypto deposits
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Network</Label>
              <Select
                value={form.network}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    network: v,
                    currency: CURRENCIES[v]?.[0] || "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NETWORKS.map((n) => (
                    <SelectItem key={n.value} value={n.value}>
                      <div className="flex items-center gap-2">
                        <span>{n.icon}</span>
                        <span>{n.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(CURRENCIES[form.network] || []).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Main USDT Polygon"
              />
            </div>

            <div className="space-y-2">
              <Label>Wallet Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="0x..."
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Internal notes"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editingWallet ? "Update" : "Add Wallet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
