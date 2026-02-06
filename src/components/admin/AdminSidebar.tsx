import { useState } from "react";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Server, 
  ListTodo, 
  DollarSign, 
  Inbox,
  LogOut,
  Zap,
  AlertTriangle,
  BookOpen,
  Mail
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
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

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

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

export const AdminSidebar = ({ activeTab, onTabChange }: AdminSidebarProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 h-[calc(var(--app-vh,1vh)*100)] w-64 border-r border-border bg-card flex flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-border px-6 shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">
              <span className="text-gradient">Re</span>
              <span className="text-primary">Graph</span>
            </span>
          </Link>
        </div>

        {/* Navigation - scrollable */}
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                activeTab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer - always visible */}
        <div className="border-t border-border p-4 space-y-1 shrink-0 pb-[env(safe-area-inset-bottom,1rem)]">
          <Link
            to="/dashboard"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </Link>
          <button
            onClick={() => setShowSignOutDialog(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

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
            <AlertDialogAction onClick={handleSignOut}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};