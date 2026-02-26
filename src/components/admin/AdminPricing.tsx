import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { DollarSign, Cpu, BrainCircuit, Plus, Trash2, Save, ChevronDown, ChevronUp, Image, Mic, Video } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  pricing_unit: string;
  price_per_1k_input_tokens: number;
  price_per_1k_output_tokens: number;
  price_per_1k_cache_write_tokens: number;
  price_per_1k_cache_read_tokens: number;
  price_per_image: number;
  price_per_minute: number;
  price_per_video: number;
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

const UNIT_CATEGORIES = ["image-gen", "image-edit", "audio", "tts", "video"];

const isUnitModel = (m: ModelPrice) =>
  UNIT_CATEGORIES.includes(m.category) || (m.pricing_unit && m.pricing_unit !== "token");

const defaultNewTokenModel = {
  model_id: "", display_name: "", category: "chat", pricing_unit: "token",
  price_per_1k_input_tokens: "", price_per_1k_output_tokens: "",
  price_per_1k_cache_write_tokens: "", price_per_1k_cache_read_tokens: "",
  context_window: "", max_output_tokens: "", provider: "", description: "", notes: "",
  supports_cache: false, supports_vision: false, supports_function_calling: false,
};

const defaultNewUnitModel = {
  model_id: "", display_name: "", category: "image-gen", pricing_unit: "image",
  price_per_image: "", price_per_minute: "", price_per_video: "",
  provider: "", description: "", notes: "",
};

const unitPricingLabel: Record<string, string> = {
  "image-gen": "$ / image",
  "image-edit": "$ / image",
  audio: "$ / minute",
  tts: "$ / minute",
  video: "$ / clip",
};

const unitFieldForCategory: Record<string, keyof ModelPrice> = {
  "image-gen": "price_per_image",
  "image-edit": "price_per_image",
  audio: "price_per_minute",
  tts: "price_per_minute",
  video: "price_per_video",
};

const getPriceDisplay = (m: ModelPrice) => {
  if (isUnitModel(m)) {
    const field = unitFieldForCategory[m.category];
    const val = field ? m[field] as number : 0;
    const unit = unitPricingLabel[m.category] ?? "/unit";
    return val > 0 ? `$${val.toFixed(4)} ${unit.split(" / ")[1] ? "/ " + unit.split(" / ")[1] : ""}` : "—";
  }
  return `In: $${(m.price_per_1k_input_tokens * 1000).toFixed(4)}/1M · Out: $${(m.price_per_1k_output_tokens * 1000).toFixed(4)}/1M`;
};

export const AdminPricing = () => {
  const [gpuPrices, setGpuPrices] = useState<GpuPrice[]>([]);
  const [modelPrices, setModelPrices] = useState<ModelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedGpu, setEditedGpu] = useState<Record<string, Partial<GpuPrice>>>({});
  const [editedModel, setEditedModel] = useState<Record<string, Partial<ModelPrice>>>({});
  const [showAddGpu, setShowAddGpu] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [addModelType, setAddModelType] = useState<"token" | "unit">("token");
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [newGpu, setNewGpu] = useState({ gpu_type: "", price_per_hour: "" });
  const [newTokenModel, setNewTokenModel] = useState(defaultNewTokenModel);
  const [newUnitModel, setNewUnitModel] = useState(defaultNewUnitModel);

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

  const addTokenModel = async () => {
    if (!newTokenModel.model_id || !newTokenModel.display_name) return;
    const { error } = await supabase.from("model_pricing").insert({
      model_id: newTokenModel.model_id, display_name: newTokenModel.display_name,
      category: newTokenModel.category, pricing_unit: "token",
      provider: newTokenModel.provider, description: newTokenModel.description, notes: newTokenModel.notes,
      price_per_1k_input_tokens: parseFloat(newTokenModel.price_per_1k_input_tokens) || 0,
      price_per_1k_output_tokens: parseFloat(newTokenModel.price_per_1k_output_tokens) || 0,
      price_per_1k_cache_write_tokens: parseFloat(newTokenModel.price_per_1k_cache_write_tokens) || 0,
      price_per_1k_cache_read_tokens: parseFloat(newTokenModel.price_per_1k_cache_read_tokens) || 0,
      context_window: parseInt(newTokenModel.context_window) || 0,
      max_output_tokens: parseInt(newTokenModel.max_output_tokens) || 0,
      supports_cache: newTokenModel.supports_cache, supports_vision: newTokenModel.supports_vision,
      supports_function_calling: newTokenModel.supports_function_calling,
    });
    if (error) toast.error(error.message);
    else { toast.success("Model added"); setShowAddModel(false); setNewTokenModel(defaultNewTokenModel); fetchData(); }
  };

  const addUnitModel = async () => {
    if (!newUnitModel.model_id || !newUnitModel.display_name) return;
    const pricingUnit =
      ["image-gen", "image-edit"].includes(newUnitModel.category) ? "image" :
      ["audio", "tts"].includes(newUnitModel.category) ? "minute" :
      "video";
    const { error } = await supabase.from("model_pricing").insert({
      model_id: newUnitModel.model_id, display_name: newUnitModel.display_name,
      category: newUnitModel.category, pricing_unit: pricingUnit,
      provider: newUnitModel.provider, description: newUnitModel.description, notes: newUnitModel.notes,
      price_per_image: parseFloat(newUnitModel.price_per_image) || 0,
      price_per_minute: parseFloat(newUnitModel.price_per_minute) || 0,
      price_per_video: parseFloat(newUnitModel.price_per_video) || 0,
      price_per_1k_input_tokens: 0, price_per_1k_output_tokens: 0,
    });
    if (error) toast.error(error.message);
    else { toast.success("Model added"); setShowAddModel(false); setNewUnitModel(defaultNewUnitModel); fetchData(); }
  };

  const getGpuVal = (gpu: GpuPrice, field: keyof GpuPrice) => editedGpu[gpu.id]?.[field] ?? gpu[field];
  const getModelVal = <K extends keyof ModelPrice>(m: ModelPrice, field: K): ModelPrice[K] =>
    (editedModel[m.id]?.[field] ?? m[field]) as ModelPrice[K];
  const setModelField = (id: string, field: keyof ModelPrice, value: unknown) =>
    setEditedModel((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const tokenModels = modelPrices.filter((m) => !isUnitModel(m));
  const unitModels = modelPrices.filter((m) => isUnitModel(m));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  const ModelExpandedForm = ({ model }: { model: ModelPrice }) => {
    const isUnit = isUnitModel(model);
    const hasChanges = !!editedModel[model.id];
    return (
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
                {isUnit ? (
                  <>
                    <SelectItem value="image-gen">Image Generation</SelectItem>
                    <SelectItem value="image-edit">Image Editing</SelectItem>
                    <SelectItem value="audio">Audio / STT</SelectItem>
                    <SelectItem value="tts">Text-to-Speech</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="llm">LLM</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                    <SelectItem value="reasoning">Reasoning</SelectItem>
                    <SelectItem value="code">Code</SelectItem>
                    <SelectItem value="multimodal">Multimodal</SelectItem>
                    <SelectItem value="vision">Vision</SelectItem>
                    <SelectItem value="embedding">Embeddings</SelectItem>
                    <SelectItem value="rerank">Reranking</SelectItem>
                    <SelectItem value="document">Document AI</SelectItem>
                    <SelectItem value="fine-tune">Fine-tunable</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isUnit ? (
          /* Unit-based pricing fields */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">$ / image</Label>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-sm">$</span>
                <Input type="number" step="0.0001" className="h-8 font-mono"
                  value={getModelVal(model, "price_per_image")}
                  onChange={(e) => setModelField(model.id, "price_per_image", parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">$ / audio minute</Label>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-sm">$</span>
                <Input type="number" step="0.0001" className="h-8 font-mono"
                  value={getModelVal(model, "price_per_minute")}
                  onChange={(e) => setModelField(model.id, "price_per_minute", parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">$ / video clip</Label>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-sm">$</span>
                <Input type="number" step="0.001" className="h-8 font-mono"
                  value={getModelVal(model, "price_per_video")}
                  onChange={(e) => setModelField(model.id, "price_per_video", parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>
        ) : (
          /* Token-based pricing fields */
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Вход / 1K токенов ($)</Label>
                <Input type="number" step="0.000001" className="h-8 font-mono"
                  value={getModelVal(model, "price_per_1k_input_tokens")}
                  onChange={(e) => setModelField(model.id, "price_per_1k_input_tokens", parseFloat(e.target.value) || 0)} />
                <p className="text-xs text-muted-foreground">= ${((getModelVal(model, "price_per_1k_input_tokens") as number) * 1000).toFixed(4)}/1M</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Выход / 1K токенов ($)</Label>
                <Input type="number" step="0.000001" className="h-8 font-mono"
                  value={getModelVal(model, "price_per_1k_output_tokens")}
                  onChange={(e) => setModelField(model.id, "price_per_1k_output_tokens", parseFloat(e.target.value) || 0)} />
                <p className="text-xs text-muted-foreground">= ${((getModelVal(model, "price_per_1k_output_tokens") as number) * 1000).toFixed(4)}/1M</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Cache Write / 1K ($)</Label>
                <Input type="number" step="0.0000001" className="h-8 font-mono"
                  value={getModelVal(model, "price_per_1k_cache_write_tokens")}
                  onChange={(e) => setModelField(model.id, "price_per_1k_cache_write_tokens", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Cache Read / 1K ($)</Label>
                <Input type="number" step="0.0000001" className="h-8 font-mono text-primary"
                  value={getModelVal(model, "price_per_1k_cache_read_tokens")}
                  onChange={(e) => setModelField(model.id, "price_per_1k_cache_read_tokens", parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Context Window (токены)</Label>
                <Input type="number" className="h-8"
                  value={getModelVal(model, "context_window")}
                  onChange={(e) => setModelField(model.id, "context_window", parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Output Tokens</Label>
                <Input type="number" className="h-8"
                  value={getModelVal(model, "max_output_tokens")}
                  onChange={(e) => setModelField(model.id, "max_output_tokens", parseInt(e.target.value) || 0)} />
              </div>
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
            </div>
          </>
        )}

        <div className="space-y-1">
          <Label className="text-xs">Description</Label>
          <Input className="h-8" value={getModelVal(model, "description")}
            onChange={(e) => setModelField(model.id, "description", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Notes</Label>
          <Textarea rows={2} value={getModelVal(model, "notes")}
            onChange={(e) => setModelField(model.id, "notes", e.target.value)} />
        </div>
        <div className="flex items-center gap-4">
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
    );
  };

  const ModelList = ({ models }: { models: ModelPrice[] }) => (
    <div className="space-y-2">
      {models.map((model) => {
        const isExpanded = expandedModel === model.id;
        const hasChanges = !!editedModel[model.id];
        return (
          <div key={model.id} className="rounded-lg border border-border overflow-hidden">
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
                  {hasChanges && <Badge variant="outline" className="text-xs border-primary/50 text-primary">Unsaved</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 font-mono">{getPriceDisplay(model)}</div>
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </div>
            {isExpanded && <ModelExpandedForm model={model} />}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Управление тарифами</h1>
        <p className="text-muted-foreground">GPU, языковые модели (по токенам) и медиа-модели (поштучно)</p>
      </div>

      {/* GPU Pricing */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">GPU — почасовая аренда</h2>
            <Badge variant="secondary">{gpuPrices.length}</Badge>
          </div>
          <Button size="sm" onClick={() => setShowAddGpu(true)}>
            <Plus className="h-4 w-4 mr-1" /> Добавить GPU
          </Button>
        </div>
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Тип GPU</TableHead>
                <TableHead>Цена / час</TableHead>
                <TableHead>Активен</TableHead>
                <TableHead className="w-24">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gpuPrices.map((gpu) => (
                <TableRow key={gpu.id}>
                  <TableCell className="font-mono font-medium">{gpu.gpu_type}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">$</span>
                      <Input type="number" step="0.01" className="w-28 h-8"
                        value={getGpuVal(gpu, "price_per_hour") as number}
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

      {/* Model Pricing Tabs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Модели</h2>
            <Badge variant="secondary">{modelPrices.length}</Badge>
          </div>
          <Button size="sm" onClick={() => setShowAddModel(true)}>
            <Plus className="h-4 w-4 mr-1" /> Добавить модель
          </Button>
        </div>

        <Tabs defaultValue="token">
          <TabsList>
            <TabsTrigger value="token">
              <BrainCircuit className="h-4 w-4 mr-1.5" />
              По токенам ({tokenModels.length})
            </TabsTrigger>
            <TabsTrigger value="unit">
              <Image className="h-4 w-4 mr-1.5" />
              Поштучно ({unitModels.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="token" className="mt-4">
            <ModelList models={tokenModels} />
          </TabsContent>
          <TabsContent value="unit" className="mt-4">
            <div className="mb-3 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              Модели с фиксированной ценой за единицу: изображение, минута аудио или видео-клип.
            </div>
            <ModelList models={unitModels} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add GPU Dialog */}
      <Dialog open={showAddGpu} onOpenChange={setShowAddGpu}>
        <DialogContent>
          <DialogHeader><DialogTitle>Добавить GPU</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Тип GPU (например A100 80GB)" value={newGpu.gpu_type} onChange={(e) => setNewGpu({ ...newGpu, gpu_type: e.target.value })} />
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <Input type="number" step="0.01" placeholder="Цена в час" value={newGpu.price_per_hour} onChange={(e) => setNewGpu({ ...newGpu, price_per_hour: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddGpu(false)}>Отмена</Button>
            <Button onClick={addGpu}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Model Dialog */}
      <Dialog open={showAddModel} onOpenChange={setShowAddModel}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Добавить модель</DialogTitle></DialogHeader>
          <Tabs value={addModelType} onValueChange={(v) => setAddModelType(v as "token" | "unit")}>
            <TabsList className="mb-4">
              <TabsTrigger value="token"><BrainCircuit className="h-4 w-4 mr-1.5" />По токенам</TabsTrigger>
              <TabsTrigger value="unit"><Image className="h-4 w-4 mr-1.5" />Поштучно</TabsTrigger>
            </TabsList>

            {/* Token model form */}
            <TabsContent value="token" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Model ID *</Label>
                  <Input placeholder="openai/gpt-5" value={newTokenModel.model_id} onChange={(e) => setNewTokenModel({ ...newTokenModel, model_id: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Display Name *</Label>
                  <Input placeholder="GPT-5" value={newTokenModel.display_name} onChange={(e) => setNewTokenModel({ ...newTokenModel, display_name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Provider</Label>
                  <Input placeholder="openai" value={newTokenModel.provider} onChange={(e) => setNewTokenModel({ ...newTokenModel, provider: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select value={newTokenModel.category} onValueChange={(v) => setNewTokenModel({ ...newTokenModel, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="llm">LLM</SelectItem>
                      <SelectItem value="chat">Chat</SelectItem>
                      <SelectItem value="reasoning">Reasoning</SelectItem>
                      <SelectItem value="code">Code</SelectItem>
                      <SelectItem value="multimodal">Multimodal</SelectItem>
                      <SelectItem value="vision">Vision</SelectItem>
                      <SelectItem value="embedding">Embeddings</SelectItem>
                      <SelectItem value="rerank">Reranking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Вход / 1K ($)</Label>
                  <Input type="number" step="0.000001" placeholder="0.000001" value={newTokenModel.price_per_1k_input_tokens}
                    onChange={(e) => setNewTokenModel({ ...newTokenModel, price_per_1k_input_tokens: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Выход / 1K ($)</Label>
                  <Input type="number" step="0.000001" placeholder="0.000003" value={newTokenModel.price_per_1k_output_tokens}
                    onChange={(e) => setNewTokenModel({ ...newTokenModel, price_per_1k_output_tokens: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cache Write / 1K ($)</Label>
                  <Input type="number" step="0.0000001" value={newTokenModel.price_per_1k_cache_write_tokens}
                    onChange={(e) => setNewTokenModel({ ...newTokenModel, price_per_1k_cache_write_tokens: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cache Read / 1K ($)</Label>
                  <Input type="number" step="0.0000001" value={newTokenModel.price_per_1k_cache_read_tokens}
                    onChange={(e) => setNewTokenModel({ ...newTokenModel, price_per_1k_cache_read_tokens: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Context Window</Label>
                  <Input type="number" placeholder="128000" value={newTokenModel.context_window}
                    onChange={(e) => setNewTokenModel({ ...newTokenModel, context_window: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max Output Tokens</Label>
                  <Input type="number" placeholder="16384" value={newTokenModel.max_output_tokens}
                    onChange={(e) => setNewTokenModel({ ...newTokenModel, max_output_tokens: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Switch checked={newTokenModel.supports_cache} onCheckedChange={(v) => setNewTokenModel({ ...newTokenModel, supports_cache: v })} />
                  Prompt Cache
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Switch checked={newTokenModel.supports_vision} onCheckedChange={(v) => setNewTokenModel({ ...newTokenModel, supports_vision: v })} />
                  Vision
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Switch checked={newTokenModel.supports_function_calling} onCheckedChange={(v) => setNewTokenModel({ ...newTokenModel, supports_function_calling: v })} />
                  Functions
                </label>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Textarea rows={2} value={newTokenModel.notes} onChange={(e) => setNewTokenModel({ ...newTokenModel, notes: e.target.value })} />
              </div>
            </TabsContent>

            {/* Unit model form */}
            <TabsContent value="unit" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Model ID *</Label>
                  <Input placeholder="stability/sdxl-1.0" value={newUnitModel.model_id} onChange={(e) => setNewUnitModel({ ...newUnitModel, model_id: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Display Name *</Label>
                  <Input placeholder="SDXL 1.0" value={newUnitModel.display_name} onChange={(e) => setNewUnitModel({ ...newUnitModel, display_name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Provider</Label>
                  <Input placeholder="stability" value={newUnitModel.provider} onChange={(e) => setNewUnitModel({ ...newUnitModel, provider: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select value={newUnitModel.category} onValueChange={(v) => setNewUnitModel({ ...newUnitModel, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image-gen">Image Generation</SelectItem>
                      <SelectItem value="image-edit">Image Editing</SelectItem>
                      <SelectItem value="audio">Speech Recognition</SelectItem>
                      <SelectItem value="tts">Text-to-Speech</SelectItem>
                      <SelectItem value="video">Video Generation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                Заполните только нужное поле в зависимости от категории модели.
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Image className="h-3 w-3" /> $ / изображение</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">$</span>
                    <Input type="number" step="0.0001" placeholder="0.004" value={newUnitModel.price_per_image}
                      onChange={(e) => setNewUnitModel({ ...newUnitModel, price_per_image: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Mic className="h-3 w-3" /> $ / минута</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">$</span>
                    <Input type="number" step="0.0001" placeholder="0.006" value={newUnitModel.price_per_minute}
                      onChange={(e) => setNewUnitModel({ ...newUnitModel, price_per_minute: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Video className="h-3 w-3" /> $ / клип</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">$</span>
                    <Input type="number" step="0.001" placeholder="0.04" value={newUnitModel.price_per_video}
                      onChange={(e) => setNewUnitModel({ ...newUnitModel, price_per_video: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input placeholder="Короткое описание модели" value={newUnitModel.description}
                  onChange={(e) => setNewUnitModel({ ...newUnitModel, description: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Textarea rows={2} placeholder="Дополнительные детали (разрешение, FPS и т.д.)"
                  value={newUnitModel.notes} onChange={(e) => setNewUnitModel({ ...newUnitModel, notes: e.target.value })} />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowAddModel(false)}>Отмена</Button>
            <Button onClick={addModelType === "token" ? addTokenModel : addUnitModel}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
