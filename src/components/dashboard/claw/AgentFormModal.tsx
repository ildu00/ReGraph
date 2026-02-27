import { useState, useEffect } from "react";
import { Bot } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Globe, Code2, Image, Calculator, BookOpen } from "lucide-react";

export interface ClawAgent {
  id?: string;
  user_id?: string;
  name: string;
  emoji: string;
  description: string;
  system_prompt: string;
  model_id: string;
  tools: string[];
}

interface AgentFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (agent: Omit<ClawAgent, "id" | "user_id">) => Promise<void>;
  initial?: ClawAgent | null;
}

const MODELS = [
  { id: "gpt-5", name: "GPT-5", provider: "OpenAI" },
  { id: "gpt-5-mini", name: "GPT-5 Mini", provider: "OpenAI" },
  { id: "gpt-5.2", name: "GPT-5.2", provider: "OpenAI" },
  { id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5", provider: "Anthropic" },
  { id: "claude-opus-4.5", name: "Claude Opus 4.5", provider: "Anthropic" },
  { id: "gemini-3-pro-preview", name: "Gemini 3 Pro", provider: "Google" },
  { id: "gemini-3-flash", name: "Gemini 3 Flash", provider: "Google" },
  { id: "deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek" },
  { id: "regraph-llm", name: "ReGraph LLM", provider: "ReGraph" },
];

export const TOOLS = [
  { id: "calculator", label: "Calculator", description: "Evaluate math expressions", icon: Calculator },
  { id: "code_interpreter", label: "Code Interpreter", description: "Execute and analyze code", icon: Code2 },
  { id: "web_search", label: "Web Search", description: "Search the internet", icon: Globe },
  { id: "image_generation", label: "Image Gen", description: "Generate images from text", icon: Image },
  { id: "document_reader", label: "Document Reader", description: "Read and analyze files", icon: BookOpen },
];

const EMOJIS = ["🤖", "🦾", "🧠", "⚡", "🔬", "🎯", "🚀", "💡", "🦅", "🐉", "🌊", "🔥", "💎", "🎨", "🛡️", "⚙️"];

const DEFAULT: Omit<ClawAgent, "id" | "user_id"> = {
  name: "",
  emoji: "🤖",
  description: "",
  system_prompt: "You are a helpful AI assistant.",
  model_id: "gpt-5-mini",
  tools: ["calculator"],
};

export default function AgentFormModal({ open, onClose, onSave, initial }: AgentFormModalProps) {
  const [form, setForm] = useState(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        emoji: initial.emoji,
        description: initial.description || "",
        system_prompt: initial.system_prompt,
        model_id: initial.model_id,
        tools: initial.tools || [],
      });
    } else {
      setForm(DEFAULT);
    }
  }, [initial, open]);

  const toggleTool = (toolId: string) => {
    setForm((f) => ({
      ...f,
      tools: f.tools.includes(toolId)
        ? f.tools.filter((t) => t !== toolId)
        : [...f.tools, toolId],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            {initial ? "Edit Agent" : "Create New Agent"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Emoji + Name */}
          <div className="flex gap-3 items-start">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-12 h-12 text-2xl rounded-lg border border-border bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
              >
                {form.emoji}
              </button>
              {showEmojiPicker && (
                <div className="absolute top-14 left-0 z-50 bg-popover border border-border rounded-lg p-2 grid grid-cols-8 gap-1 shadow-lg">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => { setForm((f) => ({ ...f, emoji: e })); setShowEmojiPicker(false); }}
                      className="w-8 h-8 text-lg rounded hover:bg-accent transition-colors flex items-center justify-center"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1">
              <Label>Name</Label>
              <Input
                placeholder="e.g. Research Assistant"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              placeholder="What does this agent do?"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Model */}
          <div className="space-y-1">
            <Label>Model</Label>
            <Select value={form.model_id} onValueChange={(v) => setForm((f) => ({ ...f, model_id: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span>{m.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{m.provider}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* System Prompt */}
          <div className="space-y-1">
            <Label>System Prompt</Label>
            <Textarea
              className="min-h-[100px] resize-none"
              placeholder="Describe the agent's role, personality, and instructions..."
              value={form.system_prompt}
              onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
            />
          </div>

          {/* Tools */}
          <div className="space-y-2">
            <Label>Enabled Tools</Label>
            <div className="space-y-2">
              {TOOLS.map((tool) => {
                const Icon = tool.icon;
                const enabled = form.tools.includes(tool.id);
                return (
                  <div
                    key={tool.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                      enabled ? "border-primary/50 bg-primary/5" : "border-border bg-card"
                    }`}
                    onClick={() => toggleTool(tool.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
                      <div>
                        <div className="text-sm font-medium">{tool.label}</div>
                        <div className="text-xs text-muted-foreground">{tool.description}</div>
                      </div>
                    </div>
                    <Switch checked={enabled} onCheckedChange={() => toggleTool(tool.id)} onClick={(e) => e.stopPropagation()} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? "Saving..." : initial ? "Save Changes" : "Create Agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
