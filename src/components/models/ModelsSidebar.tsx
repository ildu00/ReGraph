import { useEffect, useState } from "react";
import { 
  MessageSquare,
  Image,
  Eye,
  Mic,
  Database,
  Code,
  Sparkles
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface ModelsSidebarProps {
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

const modelCategories = [
  { id: "llm", label: "Large Language Models", icon: MessageSquare, count: 12 },
  { id: "image-gen", label: "Image Generation", icon: Image, count: 8 },
  { id: "vision", label: "Vision & Understanding", icon: Eye, count: 5 },
  { id: "audio", label: "Audio & Speech", icon: Mic, count: 6 },
  { id: "embedding", label: "Embeddings", icon: Database, count: 4 },
  { id: "code", label: "Code Generation", icon: Code, count: 7 },
  { id: "multimodal", label: "Multimodal", icon: Sparkles, count: 3 },
];

const ModelsSidebar = ({ activeCategory, onCategoryChange }: ModelsSidebarProps) => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const [footerOverlapPx, setFooterOverlapPx] = useState(0);

  useEffect(() => {
    const footerEl =
      document.getElementById("site-footer") ??
      document.querySelector("footer");

    if (!footerEl) return;

    let raf = 0;

    const update = () => {
      raf = 0;
      const rect = footerEl.getBoundingClientRect();
      const overlap = Math.max(0, window.innerHeight - rect.top);
      setFooterOverlapPx(Math.round(overlap));
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  const handleClick = (categoryId: string) => {
    onCategoryChange(categoryId);
  };

  return (
    <Sidebar 
      collapsible="icon" 
      desktopMode="fixed"
      style={footerOverlapPx ? { bottom: footerOverlapPx } : undefined}
      className="border-r border-border/50"
    >
      <SidebarContent className="pt-20">
        <div className="px-3 mb-2">
          <SidebarTrigger />
        </div>

        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              Model Types
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {modelCategories.map((category) => (
                <SidebarMenuItem key={category.id}>
                  <SidebarMenuButton
                    onClick={() => handleClick(category.id)}
                    isActive={activeCategory === category.id}
                    tooltip={category.label}
                  >
                    <category.icon className="h-4 w-4" />
                    {!isCollapsed && (
                      <div className="flex items-center justify-between w-full">
                        <span>{category.label}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {category.count}
                        </span>
                      </div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default ModelsSidebar;
