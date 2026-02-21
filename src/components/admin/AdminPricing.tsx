import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { DollarSign, Cpu, BrainCircuit, Plus, Trash2, Save } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  is_active: boolean;
}

export const AdminPricing = () => {
  const [gpuPrices, setGpuPrices] = useState<GpuPrice[]>([]);
  const [modelPrices, setModelPrices] = useState<ModelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedGpu, setEditedGpu] = useState<Record<string, Partial<GpuPrice>>>({});
  const [editedModel, setEditedModel] = useState<Record<string, Partial<ModelPrice>>>({});
  const [showAddGpu, setShowAddGpu] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [newGpu, setNewGpu] = useState({ gpu_type: "", price_per_hour: "" });
  const [newModel, setNewModel] = useState({
    model_id: "",
    display_name: "",
    category: "chat",
    price_per_1k_input_tokens: "",
    price_per_1k_output_tokens: "",
  });

  const fetchData = async () => {
    setLoading(true);
    const [gpuRes, modelRes] = await Promise.all([
      supabase.from("gpu_pricing").select("*").order("gpu_type"),
      supabase.from("model_pricing").select("*").order("model_id"),
    ]);
    if (gpuRes.data) setGpuPrices(gpuRes.data);
    if (modelRes.data) setModelPrices(modelRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveGpuPrice = async (id: string) => {
    const changes = editedGpu[id];
    if (!changes) return;
    const { error } = await supabase.from("gpu_pricing").update(changes).eq("id", id);
    if (error) {
      toast.error("Failed to update GPU price");
    } else {
      toast.success("GPU price updated");
      setEditedGpu((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      fetchData();
    }
  };

  const saveModelPrice = async (id: string) => {
    const changes = editedModel[id];
    if (!changes) return;
    const { error } = await supabase.from("model_pricing").update(changes).eq("id", id);
    if (error) {
      toast.error("Failed to update model price");
    } else {
      toast.success("Model price updated");
      setEditedModel((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
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
      price_per_1k_input_tokens: parseFloat(newModel.price_per_1k_input_tokens) || 0,
      price_per_1k_output_tokens: parseFloat(newModel.price_per_1k_output_tokens) || 0,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Model added");
      setShowAddModel(false);
      setNewModel({ model_id: "", display_name: "", category: "chat", price_per_1k_input_tokens: "", price_per_1k_output_tokens: "" });
      fetchData();
    }
  };

  const getGpuValue = (gpu: GpuPrice, field: keyof GpuPrice) => {
    return editedGpu[gpu.id]?.[field] ?? gpu[field];
  };

  const getModelValue = (model: ModelPrice, field: keyof ModelPrice) => {
    return editedModel[model.id]?.[field] ?? model[field];
  };

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
        <p className="text-muted-foreground">Manage GPU hourly rates and model per-request pricing</p>
      </div>

      {/* GPU Hourly Pricing */}
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
                      <Input
                        type="number"
                        step="0.01"
                        className="w-28 h-8"
                        value={getGpuValue(gpu, "price_per_hour") as number}
                        onChange={(e) =>
                          setEditedGpu((prev) => ({
                            ...prev,
                            [gpu.id]: { ...prev[gpu.id], price_per_hour: parseFloat(e.target.value) },
                          }))
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={getGpuValue(gpu, "is_active") as boolean}
                      onCheckedChange={(v) =>
                        setEditedGpu((prev) => ({
                          ...prev,
                          [gpu.id]: { ...prev[gpu.id], is_active: v },
                        }))
                      }
                    />
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

      {/* Model Request Pricing */}
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

        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead>Input / 1K tokens</TableHead>
                <TableHead>Output / 1K tokens</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modelPrices.map((model) => (
                <TableRow key={model.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{model.display_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{model.model_id}</div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="capitalize">{model.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.00001"
                        className="w-28 h-8"
                        value={getModelValue(model, "price_per_1k_input_tokens") as number}
                        onChange={(e) =>
                          setEditedModel((prev) => ({
                            ...prev,
                            [model.id]: { ...prev[model.id], price_per_1k_input_tokens: parseFloat(e.target.value) },
                          }))
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.00001"
                        className="w-28 h-8"
                        value={getModelValue(model, "price_per_1k_output_tokens") as number}
                        onChange={(e) =>
                          setEditedModel((prev) => ({
                            ...prev,
                            [model.id]: { ...prev[model.id], price_per_1k_output_tokens: parseFloat(e.target.value) },
                          }))
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={getModelValue(model, "is_active") as boolean}
                      onCheckedChange={(v) =>
                        setEditedModel((prev) => ({
                          ...prev,
                          [model.id]: { ...prev[model.id], is_active: v },
                        }))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {editedModel[model.id] && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveModelPrice(model.id)}>
                          <Save className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteModel(model.id)}>
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

      {/* Add GPU Dialog */}
      <Dialog open={showAddGpu} onOpenChange={setShowAddGpu}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add GPU Pricing</DialogTitle>
          </DialogHeader>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Model Pricing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Model ID (e.g. openai/gpt-5)" value={newModel.model_id} onChange={(e) => setNewModel({ ...newModel, model_id: e.target.value })} />
            <Input placeholder="Display Name" value={newModel.display_name} onChange={(e) => setNewModel({ ...newModel, display_name: e.target.value })} />
            <Select value={newModel.category} onValueChange={(v) => setNewModel({ ...newModel, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="chat">Chat</SelectItem>
                <SelectItem value="reasoning">Reasoning</SelectItem>
                <SelectItem value="code">Code</SelectItem>
                <SelectItem value="image-gen">Image Gen</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" step="0.00001" placeholder="Price per 1K input tokens ($)" value={newModel.price_per_1k_input_tokens} onChange={(e) => setNewModel({ ...newModel, price_per_1k_input_tokens: e.target.value })} />
            <Input type="number" step="0.00001" placeholder="Price per 1K output tokens ($)" value={newModel.price_per_1k_output_tokens} onChange={(e) => setNewModel({ ...newModel, price_per_1k_output_tokens: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModel(false)}>Cancel</Button>
            <Button onClick={addModel}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
