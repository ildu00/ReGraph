import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Bot, Plus, Trash2, CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ClawAgent } from "./AgentFormModal";

interface TelegramBot {
  id: string;
  agent_id: string;
  bot_token: string;
  bot_username: string | null;
  is_active: boolean;
  webhook_set: boolean;
  created_at: string;
}

interface TelegramIntegrationProps {
  agents: ClawAgent[];
}

export default function TelegramIntegration({ agents }: TelegramIntegrationProps) {
  const { user } = useAuth();
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TelegramBot | null>(null);

  const fetchBots = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("telegram-bot-setup", {
        body: { action: "list" },
      });
      if (res.data?.bots) setBots(res.data.bots);
    } catch {
      // silent
    }
    setLoading(false);
  };

  useEffect(() => { fetchBots(); }, [user]);

  const handleDisconnect = async () => {
    if (!deleteTarget) return;
    const res = await supabase.functions.invoke("telegram-bot-setup", {
      body: { action: "disconnect", bot_id: deleteTarget.id },
    });
    if (res.data?.ok) {
      toast.success("Bot disconnected");
      fetchBots();
    } else {
      toast.error("Failed to disconnect bot");
    }
    setDeleteTarget(null);
  };

  const agentName = (agentId: string) => agents.find((a) => a.id === agentId)?.name ?? agentId;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Telegram Bots</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Connect your Telegram bots to Claw agents</p>
        </div>
        {agents.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Connect Bot
          </Button>
        )}
      </div>

      {agents.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">Create an agent first to connect a Telegram bot.</p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading bots...
        </div>
      ) : bots.length === 0 && agents.length > 0 ? (
        <div className="border border-dashed border-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground">No bots connected yet.</p>
          <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={() => setModalOpen(true)}>
            <Plus className="h-3 w-3 mr-1" />
            Connect your first bot
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {bots.map((bot) => (
            <Card key={bot.id} className="bg-card border border-border">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {bot.bot_username ? `@${bot.bot_username}` : "Telegram Bot"}
                    </span>
                    {bot.webhook_set && bot.is_active ? (
                      <Badge variant="secondary" className="text-xs gap-1 bg-primary/10 text-primary border-primary/20">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs gap-1 bg-destructive/10 text-destructive border-destructive/20">
                        <XCircle className="h-2.5 w-2.5" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    Agent: {agentName(bot.agent_id)}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {bot.bot_username && (
                    <a
                      href={`https://t.me/${bot.bot_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => setDeleteTarget(bot)}
                    className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConnectBotModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        agents={agents}
        onConnected={() => { setModalOpen(false); fetchBots(); }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Bot</AlertDialogTitle>
            <AlertDialogDescription>
              Disconnect @{deleteTarget?.bot_username ?? "this bot"}? The bot will stop responding to messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ConnectBotModal({ open, onClose, agents, onConnected }: {
  open: boolean;
  onClose: () => void;
  agents: ClawAgent[];
  onConnected: () => void;
}) {
  const [botToken, setBotToken] = useState("");
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setBotToken("");
      setAgentId(agents[0]?.id ?? "");
    }
  }, [open, agents]);

  const handleConnect = async () => {
    if (!botToken.trim() || !agentId) return;
    setSaving(true);
    try {
      const res = await supabase.functions.invoke("telegram-bot-setup", {
        body: { action: "connect", bot_token: botToken.trim(), agent_id: agentId },
      });
      if (res.error) {
        toast.error(res.error.message || "Failed to connect bot");
      } else if (res.data?.ok) {
        toast.success(`Bot @${res.data.bot_username} connected!`);
        onConnected();
      } else {
        toast.error(res.data?.error || "Failed to connect bot. Check your token.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Connection failed");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Telegram Bot</DialogTitle>
          <DialogDescription>
            Link a Telegram bot to a Claw agent. Messages sent to the bot will be processed by the agent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">How to get a Bot Token:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Open Telegram and search for <span className="font-mono">@BotFather</span></li>
              <li>Send <span className="font-mono">/newbot</span> and follow the instructions</li>
              <li>Copy the API token (format: <span className="font-mono">1234567890:AAF...</span>)</li>
            </ol>
          </div>

          <div className="space-y-1.5">
            <Label>Bot Token</Label>
            <Input
              placeholder="1234567890:AAFxxxx..."
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Assign to Agent</Label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id!}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConnect} disabled={saving || !botToken.trim() || !agentId}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Connecting...</> : "Connect Bot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
