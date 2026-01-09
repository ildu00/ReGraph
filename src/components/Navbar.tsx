import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Zap, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { label: "Pricing", href: "#pricing", isRoute: false },
  { label: "How It Works", href: "#how-it-works", isRoute: false },
  { label: "Features", href: "#features", isRoute: false },
  { label: "API", href: "#api", isRoute: false },
  { label: "Docs", href: "/docs", isRoute: true },
];

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeHash, setActiveHash] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    if (location.pathname !== "/") {
      // Navigate to home page with hash
      navigate("/" + href);
    } else {
      // Already on home page, just scroll
      setActiveHash(href);
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll spy - highlight current section while scrolling on the landing page
  useEffect(() => {
    if (location.pathname !== "/") return;

    const hashIds = navItems
      .filter((item) => !item.isRoute)
      .map((item) => item.href.replace("#", ""));

    type SectionInfo = { id: string; top: number };
    let sections: SectionInfo[] = [];

    const computeSections = () => {
      sections = hashIds
        .map((id) => {
          const el = document.getElementById(id);
          return el ? { id, top: el.offsetTop } : null;
        })
        .filter((v): v is SectionInfo => Boolean(v))
        .sort((a, b) => a.top - b.top);
    };

    const findActiveSection = () => {
      // Clear highlight when we're at the very top (hero)
      if (window.scrollY < 40) {
        setActiveHash("");
        return;
      }

      const headerOffset = 80; // fixed navbar + a bit of breathing room
      const position = window.scrollY + headerOffset;

      let current = "";
      for (const section of sections) {
        if (position >= section.top) current = `#${section.id}`;
        else break;
      }
      setActiveHash(current);
    };

    const refresh = () => {
      computeSections();
      findActiveSection();
    };

    // Initial calculation (after layout settles)
    const t1 = window.setTimeout(refresh, 0);
    const t2 = window.setTimeout(refresh, 200);

    window.addEventListener("scroll", findActiveSection, { passive: true });
    window.addEventListener("resize", refresh);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("scroll", findActiveSection);
      window.removeEventListener("resize", refresh);
    };
  }, [location.pathname]);

  const isActive = (item: typeof navItems[0]) => {
    if (item.isRoute) {
      return location.pathname === item.href || location.pathname.startsWith(item.href + "/");
    }
    // For hash links, only check if we're on the home page
    if (location.pathname === "/") {
      return activeHash === item.href;
    }
    return false;
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? "bg-background/80 backdrop-blur-xl border-b border-border" : ""
        }`}
      >
        <div className="container px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">
                <span className="text-gradient">Re</span>
                <span className="text-primary">Graph</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navItems.map((item) =>
                item.isRoute ? (
                  <Link
                    key={item.label}
                    to={item.href}
                    className={`text-sm transition-colors ${
                      isActive(item) 
                        ? "text-primary font-medium" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => handleAnchorClick(e, item.href)}
                    className={`text-sm transition-colors cursor-pointer ${
                      isActive(item) 
                        ? "text-primary font-medium" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </a>
                )
              )}
            </div>

            {/* Desktop CTAs */}
            <div className="hidden md:flex items-center gap-3">
              {!loading && user ? (
                <Button size="sm" className="glow-primary" asChild>
                  <Link to="/dashboard">
                    <LayoutDashboard className="mr-1 h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/auth">Sign In</Link>
                  </Button>
                  <Button size="sm" className="glow-primary" asChild>
                    <Link to="/auth">
                      <Zap className="mr-1 h-4 w-4" />
                      Get Started
                    </Link>
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-background/95 backdrop-blur-xl pt-20 px-4 md:hidden"
          >
            <div className="flex flex-col gap-4">
              {navItems.map((item) =>
                item.isRoute ? (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`text-lg py-3 border-b border-border ${
                      isActive(item) ? "text-primary font-medium" : "text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => {
                      handleAnchorClick(e, item.href);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`text-lg py-3 border-b border-border cursor-pointer ${
                      isActive(item) ? "text-primary font-medium" : "text-foreground"
                    }`}
                  >
                    {item.label}
                  </a>
                )
              )}
              <div className="flex flex-col gap-3 mt-4">
                {!loading && user ? (
                  <Button size="lg" className="glow-primary" asChild>
                    <Link to="/dashboard">
                      <LayoutDashboard className="mr-2 h-5 w-5" />
                      Dashboard
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" size="lg" asChild>
                      <Link to="/auth">Sign In</Link>
                    </Button>
                    <Button size="lg" className="glow-primary" asChild>
                      <Link to="/auth">
                        <Zap className="mr-2 h-5 w-5" />
                        Get Started Free
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
