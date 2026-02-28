import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, MessageSquare, Loader2, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import AgentFormModal, { ClawAgent, TOOLS } from "./AgentFormModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AgentLibraryProps {
  onOpenChat: (agent: ClawAgent) => void;
}

export default function AgentLibrary({ onOpenChat }: AgentLibraryProps) {
  const { user } = useAuth();
  const [agents, setAgents] = useState<ClawAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClawAgent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClawAgent | null>(null);

  const fetchAgents = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("claw_agents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load agents");
    else setAgents((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAgents(); }, [user]);

  const handleSave = async (form: Omit<ClawAgent, "id" | "user_id">) => {
    if (!user) return;
    if (editing?.id) {
      const { error } = await supabase
        .from("claw_agents")
        .update({ ...form, tools: form.tools as any })
        .eq("id", editing.id);
      if (error) { toast.error("Failed to update agent"); return; }
      toast.success("Agent updated");
    } else {
      const { error } = await supabase
        .from("claw_agents")
        .insert({ ...form, user_id: user.id, tools: form.tools as any });
      if (error) { toast.error("Failed to create agent"); return; }
      toast.success("Agent created");
    }
    setEditing(null);
    fetchAgents();
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    const { error } = await supabase.from("claw_agents").delete().eq("id", deleteTarget.id);
    if (error) toast.error("Failed to delete agent");
    else { toast.success("Agent deleted"); fetchAgents(); }
    setDeleteTarget(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4 md:pt-0 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            <span className="text-gradient">Re</span>
            <span className="text-primary">Graph</span>
            <span className="ml-2">Claw</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Build and run autonomous AI agents — your personal AI workforce
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} size="icon" className="glow-primary aspect-square h-10 w-10 shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Empty state */}
      {agents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">🦾</div>
          <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm">
            Create your first AI agent — give it a name, system prompt, and tools. Then chat with it to get work done.
          </p>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Agent
          </Button>
        </div>
      )}

      {/* Grid */}
      {agents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onOpen={() => onOpenChat(agent)}
              onEdit={() => { setEditing(agent); setModalOpen(true); }}
              onDelete={() => setDeleteTarget(agent)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <AgentFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        initial={editing}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deleteTarget?.name}"? This will also delete all conversations and messages. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AgentCard({ agent, onOpen, onEdit, onDelete }: {
  agent: ClawAgent;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const agentTools = TOOLS.filter((t) => agent.tools?.includes(t.id));

  return (
    <Card className="bg-card border border-border hover:border-primary/30 transition-all group">
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Top row */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">
              {agent.name}
            </div>
            <div className="text-xs text-muted-foreground truncate">{agent.model_id}</div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={onEdit}
              className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Description */}
        {agent.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
        )}

        {/* Tools */}
        {agentTools.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {agentTools.map((t) => {
              const Icon = t.icon;
              return (
                <Badge key={t.id} variant="secondary" className="text-xs px-2 py-0.5 gap-1">
                  <Icon className="h-2.5 w-2.5" />
                  {t.label}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Open button */}
        <Button size="sm" className="w-full mt-auto" onClick={onOpen}>
          <MessageSquare className="h-3.5 w-3.5 mr-2" />
          Open Chat
        </Button>
      </CardContent>
    </Card>
  );
}
