import { useEffect, useState } from "react";
import { 
  Book, 
  Server, 
  Key, 
  Zap, 
  Cpu,
  Shield,
  Webhook,
  Database,
  PlayCircle,
  Radio,
  Wrench
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

interface DocsSidebarProps {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
}

const gettingStartedItems = [
  { id: "getting-started", label: "Getting Started", icon: Book },
  { id: "quick-reference", label: "Quick Reference", icon: Webhook },
  { id: "authentication", label: "Authentication", icon: Key },
];

const textItems = [
  { id: "inference", label: "Text Generation", icon: Zap },
  { id: "streaming", label: "Streaming (SSE)", icon: Radio },
  { id: "function-calling", label: "Function Calling", icon: Wrench },
];

const mediaItems = [
  { id: "images", label: "Image Generation", icon: PlayCircle },
  { id: "audio-tts", label: "Text-to-Speech", icon: Radio },
  { id: "audio-stt", label: "Audio Transcription", icon: Database },
];

const advancedItems = [
  { id: "training", label: "Fine-Tuning", icon: Cpu },
  { id: "batch", label: "Batch Processing", icon: Database },
  { id: "async-tasks", label: "Async Tasks", icon: Radio },
];

const resourceItems = [
  { id: "provider-setup", label: "Provider Setup", icon: Server },
  { id: "provider-api", label: "Provider API", icon: Webhook },
  { id: "api-playground", label: "API Playground", icon: PlayCircle },
  { id: "security", label: "Security", icon: Shield },
];

const DocsSidebar = ({ activeSection, onSectionChange }: DocsSidebarProps) => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  // Keep the sidebar fixed while scrolling, but when the footer enters the viewport,
  // lift the sidebar up so it never overlaps the footer.
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

  const handleClick = (sectionId: string) => {
    onSectionChange(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
  };

  const renderMenuItems = (items: typeof gettingStartedItems) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.id}>
          <SidebarMenuButton
            onClick={() => handleClick(item.id)}
            isActive={activeSection === item.id}
            tooltip={item.label}
          >
            <item.icon className="h-4 w-4" />
            {!isCollapsed && <span>{item.label}</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

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
              Getting Started
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            {renderMenuItems(gettingStartedItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              Text
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            {renderMenuItems(textItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              Images & Audio
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            {renderMenuItems(mediaItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              Advanced
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            {renderMenuItems(advancedItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              Resources
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            {renderMenuItems(resourceItems)}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default DocsSidebar;
