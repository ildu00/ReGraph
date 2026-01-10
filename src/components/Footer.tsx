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
  const links = {
    Product: ["Features", "Pricing", "API Docs", "Models", "Changelog"],
    Resources: ["Documentation", "Blog", "Community", "Status", "Support"],
    Company: ["About", "Careers", "Contact", "Press", "Legal"],
    Developers: ["GitHub", "Discord", "SDK Libraries", "API Reference", "Examples"],
  };

  return (
    <footer className={cn("relative z-0 border-t border-border", insetLeft ? "bg-card" : "bg-card/30")}>
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
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 ReGraph. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-foreground transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
