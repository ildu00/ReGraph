import { 
  Book, 
  Server, 
  Key, 
  Zap, 
  Cpu,
  Shield,
  Webhook,
  Database,
  PlayCircle
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
  { id: "provider-setup", label: "Provider Setup", icon: Server },
];

const apiItems = [
  { id: "api-playground", label: "API Playground", icon: PlayCircle },
  { id: "api-reference", label: "API Reference", icon: Webhook },
  { id: "authentication", label: "Authentication", icon: Key },
];

const endpointItems = [
  { id: "inference", label: "Inference API", icon: Zap },
  { id: "training", label: "Training API", icon: Cpu },
  { id: "batch", label: "Batch Processing", icon: Database },
];

const securityItems = [
  { id: "security", label: "Security", icon: Shield },
];

const DocsSidebar = ({ activeSection, onSectionChange }: DocsSidebarProps) => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

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
      className="border-r border-border/50 sticky top-16 h-[calc(100vh-4rem)] shrink-0"
    >
      <SidebarContent className="pt-4">
        <div className="px-3 mb-2">
          <SidebarTrigger />
        </div>

        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              Introduction
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            {renderMenuItems(gettingStartedItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              API
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            {renderMenuItems(apiItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              Endpoints
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            {renderMenuItems(endpointItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              Resources
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            {renderMenuItems(securityItems)}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default DocsSidebar;
