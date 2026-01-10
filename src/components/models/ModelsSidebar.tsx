import { useEffect, useState } from "react";
import { 
  MessageSquare,
  Image,
  Eye,
  Mic,
  Database,
  Code,
  Sparkles,
  Video,
  FileText,
  Brain,
  Wand2,
  Music,
  ScanSearch,
  FileCode2,
  Layers,
  Bot,
  Cpu
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

const categoryGroups = [
  {
    label: "Text & Language",
    categories: [
      { id: "llm", label: "Large Language Models", icon: MessageSquare, count: 6 },
      { id: "chat", label: "Chat & Assistants", icon: Bot, count: 4 },
      { id: "reasoning", label: "Reasoning & Analysis", icon: Brain, count: 3 },
    ]
  },
  {
    label: "Vision & Image",
    categories: [
      { id: "image-gen", label: "Image Generation", icon: Image, count: 4 },
      { id: "vision", label: "Vision & Understanding", icon: Eye, count: 3 },
      { id: "image-edit", label: "Image Editing", icon: Wand2, count: 2 },
    ]
  },
  {
    label: "Audio & Video",
    categories: [
      { id: "audio", label: "Speech Recognition", icon: Mic, count: 3 },
      { id: "tts", label: "Text-to-Speech", icon: Music, count: 3 },
      { id: "video", label: "Video Generation", icon: Video, count: 2 },
    ]
  },
  {
    label: "Specialized",
    categories: [
      { id: "code", label: "Code Generation", icon: Code, count: 3 },
      { id: "embedding", label: "Embeddings", icon: Database, count: 3 },
      { id: "document", label: "Document AI", icon: FileText, count: 2 },
      { id: "ocr", label: "OCR & Extraction", icon: ScanSearch, count: 2 },
    ]
  },
  {
    label: "Advanced",
    categories: [
      { id: "multimodal", label: "Multimodal", icon: Sparkles, count: 3 },
      { id: "agents", label: "AI Agents", icon: Cpu, count: 2 },
      { id: "fine-tune", label: "Fine-tunable", icon: Layers, count: 4 },
    ]
  },
];

const ModelsSidebar = ({ activeCategory, onCategoryChange }: ModelsSidebarProps) => {
  const { state, isMobile, setOpenMobile } = useSidebar();
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
    // Close sidebar on mobile after selection
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar 
      collapsible="icon" 
      desktopMode="fixed"
      style={footerOverlapPx ? { bottom: footerOverlapPx } : undefined}
      className="border-r border-border/50"
    >
      <SidebarContent className="pt-4 md:pt-20">
        <div className="px-3 mb-2 hidden md:block">
          <SidebarTrigger />
        </div>

        {categoryGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {!isCollapsed && (
              <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.categories.map((category) => (
                  <SidebarMenuItem key={category.id}>
                    <SidebarMenuButton
                      onClick={() => handleClick(category.id)}
                      isActive={activeCategory === category.id}
                      tooltip={category.label}
                    >
                      <category.icon className="h-4 w-4" />
                      {!isCollapsed && (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm">{category.label}</span>
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
        ))}
      </SidebarContent>
    </Sidebar>
  );
};

export default ModelsSidebar;
