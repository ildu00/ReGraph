import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayCircle, Zap, Clock, DollarSign } from "lucide-react";

export interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
  category: string;
  contextLength?: number;
  pricing: string;
  latency: string;
  tags: string[];
  isPopular?: boolean;
}

interface ModelCardProps {
  model: Model;
  onSelect: (model: Model) => void;
  isSelected: boolean;
}

const ModelCard = ({ model, onSelect, isSelected }: ModelCardProps) => {
  return (
    <div 
      className={`glass-card p-5 rounded-xl cursor-pointer transition-all hover:border-primary/50 ${
        isSelected ? "border-primary ring-1 ring-primary/30" : ""
      }`}
      onClick={() => onSelect(model)}
    >
      {/* Header - stacks on small cards */}
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate">{model.name}</h3>
            <p className="text-sm text-muted-foreground">{model.provider}</p>
          </div>
          <Button 
            size="sm" 
            variant={isSelected ? "default" : "outline"}
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(model);
            }}
          >
            <PlayCircle className="h-4 w-4 md:mr-1" />
            <span className="hidden md:inline">{isSelected ? "Selected" : "Try"}</span>
          </Button>
        </div>
        {model.isPopular && (
          <Badge variant="secondary" className="text-xs w-fit">
            <Zap className="h-3 w-3 mr-1" />
            Popular
          </Badge>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {model.description}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {model.tags.map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        {model.contextLength && (
          <div className="flex items-center gap-1">
            <span className="text-primary font-medium">{(model.contextLength / 1000).toFixed(0)}K</span>
            <span>context</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{model.latency}</span>
        </div>
        <div className="flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          <span>{model.pricing}</span>
        </div>
      </div>
    </div>
  );
};

export default ModelCard;
