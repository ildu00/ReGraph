import { useMemo, useState, useEffect } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Zap,
  Key,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Loader2,
  Server,
  Wallet,
  Shield,
} from "lucide-react";
import ApiKeysTab from "@/components/dashboard/ApiKeysTab";
import UsageTab from "@/components/dashboard/UsageTab";
import SettingsTab from "@/components/dashboard/SettingsTab";
import OverviewTab from "@/components/dashboard/OverviewTab";
import ProviderTab from "@/components/dashboard/ProviderTab";
import WalletTab from "@/components/dashboard/WalletTab";

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const [searchParams] = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["overview", "wallet", "api-keys", "provider", "usage", "settings"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navItems = useMemo(
    () => [
      { value: "overview", label: "Overview", icon: BarChart3 },
      { value: "wallet", label: "Wallet", icon: Wallet },
      { value: "api-keys", label: "API Keys", icon: Key },
      { value: "provider", label: "Provider", icon: Server },
      { value: "usage", label: "Usage", icon: BarChart3 },
      { value: "settings", label: "Settings", icon: Settings },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
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
            aria-label="Toggle menu"
          >
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <Link to="/" className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">
              <span className="text-gradient">Re</span>
              <span className="text-primary">Graph</span>
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {user.email}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSignOutDialog(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={signOut}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:flex-col fixed top-16 left-0 h-[calc(100dvh-4rem)] w-64 bg-card border-r border-border z-40 p-4 overflow-y-auto">
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Dashboard
        </div>
        <nav className="mt-2 space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => handleTabChange(item.value)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        {/* Admin Link */}
        {isAdmin && (
          <div className="border-t border-border pt-4 mt-4">
            <Link
              to="/admin"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              <Shield className="h-4 w-4" />
              <span>Admin Panel</span>
            </Link>
          </div>
        )}
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
              className="fixed top-16 left-0 h-[calc(100dvh-4rem)] w-64 bg-card border-r border-border z-40 p-4 md:hidden flex flex-col overflow-y-auto"
            >
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Dashboard
              </div>
              <nav className="mt-2 space-y-1 flex-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        handleTabChange(item.value);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
              
              {/* Admin Link - Mobile */}
              {isAdmin && (
                <div className="border-t border-border pt-4 mt-4">
                  <Link
                    to="/admin"
                    onClick={() => setIsSidebarOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    <Shield className="h-4 w-4" />
                    <span>Admin Panel</span>
                  </Link>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="pt-20 md:ml-64 px-4 md:px-8 pb-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="overview" className="data-[state=active]:bg-secondary px-2 lg:px-3">
              <BarChart3 className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="wallet" className="data-[state=active]:bg-secondary px-2 lg:px-3">
              <Wallet className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Wallet</span>
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="data-[state=active]:bg-secondary px-2 lg:px-3">
              <Key className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">API Keys</span>
            </TabsTrigger>
            <TabsTrigger value="provider" className="data-[state=active]:bg-secondary px-2 lg:px-3">
              <Server className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Provider</span>
            </TabsTrigger>
            <TabsTrigger value="usage" className="data-[state=active]:bg-secondary px-2 lg:px-3">
              <BarChart3 className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Usage</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-secondary px-2 lg:px-3">
              <Settings className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="wallet">
            <WalletTab />
          </TabsContent>

          <TabsContent value="api-keys">
            <ApiKeysTab />
          </TabsContent>

          <TabsContent value="provider">
            <ProviderTab />
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

