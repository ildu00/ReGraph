import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { DollarSign, Cpu, BrainCircuit, Plus, Trash2, Save, ChevronDown, ChevronUp } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface GpuPrice {
  id: string;
  gpu_type: string;
  price_per_hour: number;
  is_active: boolean;
}

interface ModelPrice {
  id: string;
  model_id: string;
  display_name: string;
  category: string;
  price_per_1k_input_tokens: number;
  price_per_1k_output_tokens: number;
  price_per_1k_cache_write_tokens: number;
  price_per_1k_cache_read_tokens: number;
  context_window: number;
  max_output_tokens: number;
  provider: string;
  description: string;
  supports_cache: boolean;
  supports_vision: boolean;
  supports_function_calling: boolean;
  notes: string;
  is_active: boolean;
}

const defaultNewModel = {
  model_id: "",
  display_name: "",
  category: "chat",
  price_per_1k_input_tokens: "",
  price_per_1k_output_tokens: "",
  price_per_1k_cache_write_tokens: "",
  price_per_1k_cache_read_tokens: "",
  context_window: "",
  max_output_tokens: "",
  provider: "",
  description: "",
  notes: "",
  supports_cache: false,
  supports_vision: false,
  supports_function_calling: false,
};

export const AdminPricing = () => {
  const [gpuPrices, setGpuPrices] = useState<GpuPrice[]>([]);
  const [modelPrices, setModelPrices] = useState<ModelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedGpu, setEditedGpu] = useState<Record<string, Partial<GpuPrice>>>({});
  const [editedModel, setEditedModel] = useState<Record<string, Partial<ModelPrice>>>({});
  const [showAddGpu, setShowAddGpu] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [newGpu, setNewGpu] = useState({ gpu_type: "", price_per_hour: "" });
  const [newModel, setNewModel] = useState(defaultNewModel);

  const fetchData = async () => {
    setLoading(true);
    const [gpuRes, modelRes] = await Promise.all([
      supabase.from("gpu_pricing").select("*").order("gpu_type"),
      supabase.from("model_pricing").select("*").order("display_name"),
    ]);
    if (gpuRes.data) setGpuPrices(gpuRes.data);
    if (modelRes.data) setModelPrices(modelRes.data as ModelPrice[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const saveGpuPrice = async (id: string) => {
    const changes = editedGpu[id];
    if (!changes) return;
    const { error } = await supabase.from("gpu_pricing").update(changes).eq("id", id);
    if (error) toast.error("Failed to update GPU price");
    else {
      toast.success("GPU price updated");
      setEditedGpu((prev) => { const n = { ...prev }; delete n[id]; return n; });
      fetchData();
    }
  };

  const saveModelPrice = async (id: string) => {
    const changes = editedModel[id];
    if (!changes) return;
    const { error } = await supabase.from("model_pricing").update(changes).eq("id", id);
    if (error) toast.error("Failed to update model price");
    else {
      toast.success("Model price updated");
      setEditedModel((prev) => { const n = { ...prev }; delete n[id]; return n; });
      fetchData();
    }
  };

  const deleteGpu = async (id: string) => {
    const { error } = await supabase.from("gpu_pricing").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Deleted"); fetchData(); }
  };

  const deleteModel = async (id: string) => {
    const { error } = await supabase.from("model_pricing").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Deleted"); fetchData(); }
  };

  const addGpu = async () => {
    if (!newGpu.gpu_type || !newGpu.price_per_hour) return;
    const { error } = await supabase.from("gpu_pricing").insert({
      gpu_type: newGpu.gpu_type,
      price_per_hour: parseFloat(newGpu.price_per_hour),
    });
    if (error) toast.error(error.message);
    else { toast.success("GPU added"); setShowAddGpu(false); setNewGpu({ gpu_type: "", price_per_hour: "" }); fetchData(); }
  };

  const addModel = async () => {
    if (!newModel.model_id || !newModel.display_name) return;
    const { error } = await supabase.from("model_pricing").insert({
      model_id: newModel.model_id,
      display_name: newModel.display_name,
      category: newModel.category,
      provider: newModel.provider,
      description: newModel.description,
      notes: newModel.notes,
      price_per_1k_input_tokens: parseFloat(newModel.price_per_1k_input_tokens) || 0,
      price_per_1k_output_tokens: parseFloat(newModel.price_per_1k_output_tokens) || 0,
      price_per_1k_cache_write_tokens: parseFloat(newModel.price_per_1k_cache_write_tokens) || 0,
      price_per_1k_cache_read_tokens: parseFloat(newModel.price_per_1k_cache_read_tokens) || 0,
      context_window: parseInt(newModel.context_window) || 0,
      max_output_tokens: parseInt(newModel.max_output_tokens) || 0,
      supports_cache: newModel.supports_cache,
      supports_vision: newModel.supports_vision,
      supports_function_calling: newModel.supports_function_calling,
    });
    if (error) toast.error(error.message);
    else { toast.success("Model added"); setShowAddModel(false); setNewModel(defaultNewModel); fetchData(); }
  };

  const getGpuVal = (gpu: GpuPrice, field: keyof GpuPrice) => editedGpu[gpu.id]?.[field] ?? gpu[field];
  const getModelVal = <K extends keyof ModelPrice>(m: ModelPrice, field: K): ModelPrice[K] =>
    (editedModel[m.id]?.[field] ?? m[field]) as ModelPrice[K];

  const setModelField = (id: string, field: keyof ModelPrice, value: unknown) =>
    setEditedModel((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Pricing Management</h1>
        <p className="text-muted-foreground">Manage GPU hourly rates and model per-request pricing (input, output, cache)</p>
      </div>

      {/* GPU Pricing */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">GPU Hourly Pricing</h2>
            <Badge variant="secondary">{gpuPrices.length}</Badge>
          </div>
          <Button size="sm" onClick={() => setShowAddGpu(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add GPU
          </Button>
        </div>
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GPU Type</TableHead>
                <TableHead>Price / Hour</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gpuPrices.map((gpu) => (
                <TableRow key={gpu.id}>
                  <TableCell className="font-mono font-medium">{gpu.gpu_type}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">$</span>
                      <Input type="number" step="0.01" className="w-28 h-8" value={getGpuVal(gpu, "price_per_hour") as number}
                        onChange={(e) => setEditedGpu((prev) => ({ ...prev, [gpu.id]: { ...prev[gpu.id], price_per_hour: parseFloat(e.target.value) } }))} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch checked={getGpuVal(gpu, "is_active") as boolean}
                      onCheckedChange={(v) => setEditedGpu((prev) => ({ ...prev, [gpu.id]: { ...prev[gpu.id], is_active: v } }))} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {editedGpu[gpu.id] && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveGpuPrice(gpu.id)}>
                          <Save className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteGpu(gpu.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Model Pricing */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Model Request Pricing</h2>
            <Badge variant="secondary">{modelPrices.length}</Badge>
          </div>
          <Button size="sm" onClick={() => setShowAddModel(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Model
          </Button>
        </div>

        <div className="space-y-2">
          {modelPrices.map((model) => {
            const isExpanded = expandedModel === model.id;
            const hasChanges = !!editedModel[model.id];
            return (
              <div key={model.id} className="rounded-lg border border-border overflow-hidden">
                {/* Row header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-card/50 transition-colors"
                  onClick={() => setExpandedModel(isExpanded ? null : model.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{model.display_name}</span>
                      <span className="text-xs font-mono text-muted-foreground">{model.model_id}</span>
                      <Badge variant="outline" className="capitalize text-xs">{model.category}</Badge>
                      {model.provider && <Badge variant="secondary" className="text-xs">{model.provider}</Badge>}
                      {!model.is_active && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                      {hasChanges && <Badge className="text-xs bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Unsaved</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                      In: ${(model.price_per_1k_input_tokens * 1000).toFixed(4)}/1M · Out: ${(model.price_per_1k_output_tokens * 1000).toFixed(4)}/1M
                      {model.supports_cache && ` · Cache read: $${(model.price_per_1k_cache_read_tokens * 1000).toFixed(4)}/1M`}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                </div>

                {/* Expanded edit form */}
                {isExpanded && (
                  <div className="border-t border-border px-4 py-4 bg-card/30 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Display Name</Label>
                        <Input className="h-8" value={getModelVal(model, "display_name")}
                          onChange={(e) => setModelField(model.id, "display_name", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Provider</Label>
                        <Input className="h-8" placeholder="openai / google / anthropic" value={getModelVal(model, "provider")}
                          onChange={(e) => setModelField(model.id, "provider", e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Category</Label>
                        <Select value={getModelVal(model, "category")} onValueChange={(v) => setModelField(model.id, "category", v)}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="chat">Chat</SelectItem>
                            <SelectItem value="reasoning">Reasoning</SelectItem>
                            <SelectItem value="code">Code</SelectItem>
                            <SelectItem value="image-gen">Image Gen</SelectItem>
                            <SelectItem value="audio">Audio</SelectItem>
                            <SelectItem value="embeddings">Embeddings</SelectItem>
                            <SelectItem value="reranking">Reranking</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Context Window (tokens)</Label>
                        <Input type="number" className="h-8" value={getModelVal(model, "context_window")}
                          onChange={(e) => setModelField(model.id, "context_window", parseInt(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Max Output Tokens</Label>
                        <Input type="number" className="h-8" value={getModelVal(model, "max_output_tokens")}
                          onChange={(e) => setModelField(model.id, "max_output_tokens", parseInt(e.target.value) || 0)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Input / 1K tokens ($)</Label>
                        <Input type="number" step="0.000001" className="h-8 font-mono" value={getModelVal(model, "price_per_1k_input_tokens")}
                          onChange={(e) => setModelField(model.id, "price_per_1k_input_tokens", parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Output / 1K tokens ($)</Label>
                        <Input type="number" step="0.000001" className="h-8 font-mono" value={getModelVal(model, "price_per_1k_output_tokens")}
                          onChange={(e) => setModelField(model.id, "price_per_1k_output_tokens", parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Cache Write / 1K ($)</Label>
                        <Input type="number" step="0.0000001" className="h-8 font-mono" value={getModelVal(model, "price_per_1k_cache_write_tokens")}
                          onChange={(e) => setModelField(model.id, "price_per_1k_cache_write_tokens", parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Cache Read / 1K ($)</Label>
                        <Input type="number" step="0.0000001" className="h-8 font-mono text-primary" value={getModelVal(model, "price_per_1k_cache_read_tokens")}
                          onChange={(e) => setModelField(model.id, "price_per_1k_cache_read_tokens", parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Input className="h-8" value={getModelVal(model, "description")}
                        onChange={(e) => setModelField(model.id, "description", e.target.value)} />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Notes (shown on pricing page)</Label>
                      <Textarea rows={2} value={getModelVal(model, "notes")}
                        onChange={(e) => setModelField(model.id, "notes", e.target.value)} />
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Switch checked={getModelVal(model, "supports_cache")} onCheckedChange={(v) => setModelField(model.id, "supports_cache", v)} />
                        <span className="text-sm">Prompt Caching</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Switch checked={getModelVal(model, "supports_vision")} onCheckedChange={(v) => setModelField(model.id, "supports_vision", v)} />
                        <span className="text-sm">Vision</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Switch checked={getModelVal(model, "supports_function_calling")} onCheckedChange={(v) => setModelField(model.id, "supports_function_calling", v)} />
                        <span className="text-sm">Function Calling</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Switch checked={getModelVal(model, "is_active")} onCheckedChange={(v) => setModelField(model.id, "is_active", v)} />
                        <span className="text-sm">Active</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      {hasChanges && (
                        <Button size="sm" onClick={() => saveModelPrice(model.id)}>
                          <Save className="h-4 w-4 mr-1" /> Save Changes
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => deleteModel(model.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add GPU Dialog */}
      <Dialog open={showAddGpu} onOpenChange={setShowAddGpu}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add GPU Pricing</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="GPU Type (e.g. A100)" value={newGpu.gpu_type} onChange={(e) => setNewGpu({ ...newGpu, gpu_type: e.target.value })} />
            <Input type="number" step="0.01" placeholder="Price per hour ($)" value={newGpu.price_per_hour} onChange={(e) => setNewGpu({ ...newGpu, price_per_hour: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddGpu(false)}>Cancel</Button>
            <Button onClick={addGpu}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Model Dialog */}
      <Dialog open={showAddModel} onOpenChange={setShowAddModel}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Model Pricing</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Model ID *</Label>
                <Input placeholder="e.g. openai/gpt-5" value={newModel.model_id} onChange={(e) => setNewModel({ ...newModel, model_id: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Display Name *</Label>
                <Input placeholder="GPT-5" value={newModel.display_name} onChange={(e) => setNewModel({ ...newModel, display_name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Provider</Label>
                <Input placeholder="openai" value={newModel.provider} onChange={(e) => setNewModel({ ...newModel, provider: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select value={newModel.category} onValueChange={(v) => setNewModel({ ...newModel, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chat">Chat</SelectItem>
                    <SelectItem value="reasoning">Reasoning</SelectItem>
                    <SelectItem value="code">Code</SelectItem>
                    <SelectItem value="image-gen">Image Gen</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="embeddings">Embeddings</SelectItem>
                    <SelectItem value="reranking">Reranking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input placeholder="Brief model description" value={newModel.description} onChange={(e) => setNewModel({ ...newModel, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Context Window (tokens)</Label>
                <Input type="number" placeholder="128000" value={newModel.context_window} onChange={(e) => setNewModel({ ...newModel, context_window: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Output Tokens</Label>
                <Input type="number" placeholder="16384" value={newModel.max_output_tokens} onChange={(e) => setNewModel({ ...newModel, max_output_tokens: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Input / 1K tokens ($)</Label>
                <Input type="number" step="0.000001" placeholder="0.0001" value={newModel.price_per_1k_input_tokens} onChange={(e) => setNewModel({ ...newModel, price_per_1k_input_tokens: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Output / 1K tokens ($)</Label>
                <Input type="number" step="0.000001" placeholder="0.0004" value={newModel.price_per_1k_output_tokens} onChange={(e) => setNewModel({ ...newModel, price_per_1k_output_tokens: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cache Write / 1K ($)</Label>
                <Input type="number" step="0.0000001" placeholder="0.000125" value={newModel.price_per_1k_cache_write_tokens} onChange={(e) => setNewModel({ ...newModel, price_per_1k_cache_write_tokens: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cache Read / 1K ($)</Label>
                <Input type="number" step="0.0000001" placeholder="0.000005" value={newModel.price_per_1k_cache_read_tokens} onChange={(e) => setNewModel({ ...newModel, price_per_1k_cache_read_tokens: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} placeholder="Additional pricing notes..." value={newModel.notes} onChange={(e) => setNewModel({ ...newModel, notes: e.target.value })} />
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Switch checked={newModel.supports_cache} onCheckedChange={(v) => setNewModel({ ...newModel, supports_cache: v })} /> Prompt Caching
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Switch checked={newModel.supports_vision} onCheckedChange={(v) => setNewModel({ ...newModel, supports_vision: v })} /> Vision
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Switch checked={newModel.supports_function_calling} onCheckedChange={(v) => setNewModel({ ...newModel, supports_function_calling: v })} /> Function Calling
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModel(false)}>Cancel</Button>
            <Button onClick={addModel}>Add Model</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
