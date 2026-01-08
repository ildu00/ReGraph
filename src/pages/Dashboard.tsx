import { useState } from "react";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-xl border-b border-border z-50 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden"
          >
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <a href="/" className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-bold">
              <span className="text-gradient">Neural</span>
              <span className="text-primary">Grid</span>
            </span>
          </a>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {user.email}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Sidebar - Desktop */}
      <aside className="hidden md:block fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-card border-r border-border z-40 p-4">
        <nav className="space-y-2">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Dashboard
          </div>
        </nav>
      </aside>

      {/* Sidebar - Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 z-30 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-card border-r border-border z-40 p-4 md:hidden"
            >
              <nav className="space-y-2">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Dashboard
                </div>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="pt-20 md:ml-64 px-4 md:px-8 pb-8">
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
    </div>
  );
};

export default Dashboard;
