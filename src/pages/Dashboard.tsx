import { useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap,
  Key,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Loader2,
} from "lucide-react";
import ApiKeysTab from "@/components/dashboard/ApiKeysTab";
import UsageTab from "@/components/dashboard/UsageTab";
import SettingsTab from "@/components/dashboard/SettingsTab";
import OverviewTab from "@/components/dashboard/OverviewTab";

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <a href="/" className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          <span className="font-bold">
            <span className="text-gradient">Neural</span>
            <span className="text-primary">Grid</span>
          </span>
        </a>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: isSidebarOpen ? 0 : -280 }}
        className={`fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-40 pt-4 md:translate-x-0 md:pt-0`}
      >
        <div className="p-6 hidden md:block">
          <a href="/" className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-bold">
              <span className="text-gradient">Neural</span>
              <span className="text-primary">Grid</span>
            </span>
          </a>
        </div>

        <nav className="mt-4 md:mt-0 pt-16 md:pt-0">
          <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Dashboard
          </div>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="p-4 bg-secondary/50 rounded-lg mb-4">
            <p className="text-sm text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="md:ml-64 pt-20 md:pt-8 px-4 md:px-8 pb-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="overview" className="data-[state=active]:bg-secondary">
              <BarChart3 className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="data-[state=active]:bg-secondary">
              <Key className="mr-2 h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="usage" className="data-[state=active]:bg-secondary">
              <BarChart3 className="mr-2 h-4 w-4" />
              Usage
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-secondary">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="api-keys">
            <ApiKeysTab />
          </TabsContent>

          <TabsContent value="usage">
            <UsageTab />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
