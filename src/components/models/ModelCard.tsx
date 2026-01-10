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
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{model.name}</h3>
            {model.isPopular && (
              <Badge variant="secondary" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Popular
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{model.provider}</p>
        </div>
        <Button 
          size="sm" 
          variant={isSelected ? "default" : "outline"}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(model);
          }}
        >
          <PlayCircle className="h-4 w-4 mr-1" />
          {isSelected ? "Selected" : "Try"}
        </Button>
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
