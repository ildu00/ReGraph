import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Copy, Trash2, Key, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

const ApiKeysTab = () => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showCreatedKey, setShowCreatedKey] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, [user]);

  const fetchApiKeys = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch API keys");
    } else {
      setApiKeys(data || []);
    }
    setLoading(false);
  };

  const generateApiKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "rg_";
    for (let i = 0; i < 48; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const hashKey = async (key: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const createApiKey = async () => {
    if (!user || !newKeyName.trim()) return;
    
    setIsCreating(true);
    const newKey = generateApiKey();
    const keyHash = await hashKey(newKey);
    const keyPrefix = newKey.substring(0, 10) + "...";

    const { error } = await supabase.from("api_keys").insert({
      user_id: user.id,
      name: newKeyName.trim(),
      key_prefix: keyPrefix,
      key_hash: keyHash,
    });

    if (error) {
      toast.error("Failed to create API key");
    } else {
      setCreatedKey(newKey);
      setNewKeyName("");
      fetchApiKeys();
      toast.success("API key created successfully");
    }
    setIsCreating(false);
  };

  const deleteApiKey = async (id: string) => {
    const { error } = await supabase.from("api_keys").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete API key");
    } else {
      setApiKeys(apiKeys.filter((key) => key.id !== id));
      toast.success("API key deleted");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setCreatedKey(null);
    setShowCreatedKey(false);
    setNewKeyName("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">
            Manage your API keys for accessing ReGraph services.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) handleDialogClose();
          else setIsDialogOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button className="glow-primary w-10 h-10 p-0 sm:w-auto sm:h-auto sm:px-4 sm:py-2" aria-label="Create Key">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Create Key</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>
                {createdKey ? "API Key Created" : "Create New API Key"}
              </DialogTitle>
            </DialogHeader>

            {createdKey ? (
              <div className="space-y-4">
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">
                    Make sure to copy your API key now. You won't be able to see it again!
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Your API Key</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showCreatedKey ? "text" : "password"}
                      value={createdKey}
                      readOnly
                      className="bg-secondary border-border font-mono text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowCreatedKey(!showCreatedKey)}
                    >
                      {showCreatedKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(createdKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button onClick={handleDialogClose} className="w-full">
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="keyName">Key Name</Label>
                  <Input
                    id="keyName"
                    placeholder="e.g., Production API Key"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>
                <Button
                  onClick={createApiKey}
                  disabled={!newKeyName.trim() || isCreating}
                  className="w-full glow-primary"
                >
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create API Key
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* API Keys List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
          <p className="text-muted-foreground mb-4">
            Create your first API key to start using ReGraph.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-border text-sm font-medium text-muted-foreground">
            <div className="col-span-4">Name</div>
            <div className="col-span-3">Key</div>
            <div className="col-span-2">Created</div>
            <div className="col-span-2">Last Used</div>
            <div className="col-span-1"></div>
          </div>
          <AnimatePresence>
            {apiKeys.map((key) => (
              <motion.div
                key={key.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-12 gap-4 p-4 border-b border-border last:border-0 items-center"
              >
                <div className="col-span-4 font-medium truncate">{key.name}</div>
                <div className="col-span-3 font-mono text-sm text-muted-foreground">
                  {key.key_prefix}
                </div>
                <div className="col-span-2 text-sm text-muted-foreground">
                  {new Date(key.created_at).toLocaleDateString()}
                </div>
                <div className="col-span-2 text-sm text-muted-foreground">
                  {key.last_used_at
                    ? new Date(key.last_used_at).toLocaleDateString()
                    : "Never"}
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteApiKey(key.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default ApiKeysTab;
