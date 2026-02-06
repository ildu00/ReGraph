import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminRequests } from "@/components/admin/AdminRequests";
import { AdminResources } from "@/components/admin/AdminResources";
import { AdminTasks } from "@/components/admin/AdminTasks";
import { AdminRevenue } from "@/components/admin/AdminRevenue";
import { AdminForms } from "@/components/admin/AdminForms";
import { AdminBootEvents } from "@/components/admin/AdminBootEvents";
import { AdminBlog } from "@/components/admin/AdminBlog";
import { AdminNotifications } from "@/components/admin/AdminNotifications";
import { 
  Menu, 
  X, 
  Zap, 
  LayoutDashboard, 
  Users, 
  FileText, 
  Server, 
  ListTodo, 
  DollarSign, 
  Inbox,
  LogOut,
  AlertTriangle,
  BookOpen,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "requests", label: "Requests", icon: FileText },
  { id: "resources", label: "Resources", icon: Server },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "revenue", label: "Revenue", icon: DollarSign },
  { id: "forms", label: "Form Data", icon: Inbox },
  { id: "boot-events", label: "Boot Events", icon: AlertTriangle },
  { id: "blog", label: "Blog", icon: BookOpen },
  { id: "notifications", label: "Notifications", icon: Mail },
];

const Admin = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "dashboard");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // iOS Safari: reliable viewport height for fixed sidebars (vh/dvh can be incorrect)
  useEffect(() => {
    const setAppVh = () => {
      document.documentElement.style.setProperty(
        "--app-vh",
        `${window.innerHeight * 0.01}px`
      );
    };

    setAppVh();
    window.addEventListener("resize", setAppVh);
    window.addEventListener("orientationchange", setAppVh);
    return () => {
      window.removeEventListener("resize", setAppVh);
      window.removeEventListener("orientationchange", setAppVh);
    };
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setIsMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Loading state
  if (authLoading || adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    navigate("/auth");
    return null;
  }

  // Access denied if not admin
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-destructive mb-4">403</h1>
          <p className="text-muted-foreground mb-4">Access Denied</p>
          <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminDashboard />;
      case "users":
        return <AdminUsers />;
      case "requests":
        return <AdminRequests />;
      case "resources":
        return <AdminResources />;
      case "tasks":
        return <AdminTasks />;
      case "revenue":
        return <AdminRevenue />;
      case "forms":
        return <AdminForms />;
      case "boot-events":
        return <AdminBootEvents />;
      case "blog":
        return <AdminBlog />;
      case "notifications":
        return <AdminNotifications />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-[100vw] overflow-x-clip">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-xl px-3 sm:px-4 lg:hidden overflow-hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            aria-label="Toggle menu"
          >
            {isMobileSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
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
            {user?.email}
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

      {/* Mobile Sidebar with slide animation */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 z-40 lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-16 left-0 h-[calc((var(--app-vh,1vh)*100)-4rem)] w-64 bg-card border-r border-border z-40 p-4 lg:hidden flex flex-col"
            >
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Admin Panel
              </div>
              <nav className="mt-2 space-y-1 flex-1 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTabChange(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Mobile Sidebar Footer (always accessible) */}
              <div className="mt-4 border-t border-border pt-4 space-y-1 shrink-0 pb-[env(safe-area-inset-bottom,1rem)]">
                <Link
                  to="/dashboard"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  <span>Dashboard</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    setShowSignOutDialog(true);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  )}
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-w-0">
        <div className="p-3 sm:p-6 lg:p-8 max-w-full min-w-0">{renderContent()}</div>
      </main>
    </div>
  );
};

export default Admin;
