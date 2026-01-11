import { Link, useLocation } from "react-router-dom";
import { Github, Twitter, MessageCircle, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

type FooterProps = {
  /**
   * On pages with a fixed left sidebar, add left padding to the inner container
   * so footer content doesn't sit under the sidebar.
   */
  insetLeft?: boolean;
};

const Footer = ({ insetLeft }: FooterProps) => {
  const location = useLocation();
  
  const isActiveLink = (href: string) => {
    if (href === "#" || href.startsWith("/#")) return false;
    const path = href.split("#")[0];
    return location.pathname === path;
  };

  const links = {
    Product: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Models", href: "/models" },
      { label: "Changelog", href: "/changelog" },
    ],
    Resources: [
      { label: "Documentation", href: "/docs" },
      { label: "Blog", href: "#" },
      { label: "Status", href: "/status" },
      { label: "Support", href: "/support" },
    ],
    Company: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "#" },
      { label: "Legal", href: "/legal" },
    ],
    Developers: [
      { label: "GitHub", href: "#" },
      { label: "Discord", href: "#" },
      { label: "SDK Libraries", href: "#" },
      { label: "Examples", href: "#" },
    ],
  };

  return (
    <footer className={cn("relative z-30 border-t border-border bg-card")}>
      <div className={cn("container px-4 py-16", insetLeft && "md:pl-64")}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="text-2xl font-bold mb-4">
              <span className="text-gradient">Re</span>
              <span className="text-primary">Graph</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Decentralized AI compute for everyone.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <MessageCircle className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="font-semibold mb-4">{category}</h4>
              <ul className="space-y-2">
                {items.map((item) => {
                  const isActive = isActiveLink(item.href);
                  return (
                    <li key={item.label}>
                      {item.href.startsWith("/") && !item.href.includes("#") ? (
                        <Link
                          to={item.href}
                          className={cn(
                            "text-sm transition-colors",
                            isActive 
                              ? "text-primary font-medium" 
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <a
                          href={item.href}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {item.label}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 ReGraph. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <Link 
              to="/privacy" 
              className={cn(
                "transition-colors",
                location.pathname === "/privacy" 
                  ? "text-primary font-medium" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Privacy Policy
            </Link>
            <Link 
              to="/terms" 
              className={cn(
                "transition-colors",
                location.pathname === "/terms" 
                  ? "text-primary font-medium" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Terms of Service
            </Link>
            <Link 
              to="/cookies" 
              className={cn(
                "transition-colors",
                location.pathname === "/cookies" 
                  ? "text-primary font-medium" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
