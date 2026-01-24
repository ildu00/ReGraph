import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Github, Twitter, MessageCircle, Mail, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type FooterProps = {
  /**
   * On pages with a fixed left sidebar, add left padding to the inner container
   * so footer content doesn't sit under the sidebar.
   */
  insetLeft?: boolean;
};

const Footer = ({ insetLeft }: FooterProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const [contactOpen, setContactOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });
  
  const isActiveLink = (href: string) => {
    if (href === "#" || href.startsWith("/#")) return false;
    const path = href.split("#")[0];
    // Check for exact match or if current path starts with the link path (for nested routes like /blog/slug)
    return location.pathname === path || (path !== "/" && location.pathname.startsWith(path + "/"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.from("support_requests").insert({
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: "Contact Form Inquiry",
        message: formData.message.trim(),
        user_id: user?.id || null
      });

      if (error) throw error;

      toast.success("Message sent! We'll get back to you soon.");
      setFormData({ name: "", email: "", message: "" });
      setContactOpen(false);
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
      { label: "Blog", href: "/blog" },
      { label: "Status", href: "/status" },
      { label: "Support", href: "/support" },
    ],
    Company: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "#contact", isContact: true },
      { label: "Legal", href: "/legal" },
    ],
    Developers: [
      { label: "GitHub", href: "https://github.com/ildu00/ReGraph" },
      { label: "Telegram", href: "https://t.me/regraphai" },
      { label: "SDK Libraries", href: "https://github.com/ildu00/ReGraph/tree/main/sdk/" },
      { label: "Examples", href: "/examples" },
    ],
  };

  return (
    <>
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
                <a href="https://github.com/ildu00/ReGraph" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Github className="h-5 w-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <MessageCircle className="h-5 w-5" />
                </a>
                <button onClick={() => setContactOpen(true)} className="text-muted-foreground hover:text-primary transition-colors">
                  <Mail className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Links */}
            {Object.entries(links).map(([category, items]) => (
              <div key={category}>
                <h4 className="font-semibold mb-4">{category}</h4>
                <ul className="space-y-2">
                  {items.map((item) => {
                    const isActive = isActiveLink(item.href);
                    
                    if ('isContact' in item && item.isContact) {
                      return (
                        <li key={item.label}>
                          <button
                            onClick={() => setContactOpen(true)}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {item.label}
                          </button>
                        </li>
                      );
                    }
                    
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
            <div className="flex flex-col sm:flex-row flex-wrap justify-center md:justify-end gap-x-6 gap-y-2 text-sm items-center">
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
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
                <a 
                  href="https://regraph.tech/ReGraph_Whitepaper_v1.01.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors hidden lg:inline"
                >
                  Whitepaper v1.01
                </a>
              </div>
              {/* Whitepaper on separate line for tablet, centered for mobile */}
              <a 
                href="https://regraph.tech/ReGraph_Whitepaper_v1.01.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors lg:hidden"
              >
                Whitepaper v1.01
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Contact Dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Us</DialogTitle>
            <DialogDescription>
              Have a question or want to get in touch? Send us a message and we'll respond as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                maxLength={255}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                placeholder="How can we help you?"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
                maxLength={2000}
                required
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Footer;
