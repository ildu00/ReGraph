import { useEffect, useState, useRef } from "react";
import { Cpu, Globe, Server, Smartphone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, useInView, animate } from "framer-motion";

const CACHE_KEY = "regraph-hero-node-count";

const getCachedNodeCount = (): number | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { value, timestamp } = JSON.parse(cached);
      // Cache valid for 5 minutes
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return value;
      }
    }
  } catch {}
  return null;
};

const setCachedNodeCount = (value: number) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ value, timestamp: Date.now() }));
  } catch {}
};

const AnimatedNumber = ({ 
  from, 
  to, 
  decimals = 0, 
  prefix = "", 
  suffix = "",
  duration = 1.5 
}: { 
  from: number; 
  to: number; 
  decimals?: number; 
  prefix?: string; 
  suffix?: string;
  duration?: number;
}) => {
  const [value, setValue] = useState(from);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!isInView) return;
    
    const controls = animate(from, to, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setValue(v),
    });

    return () => controls.stop();
  }, [isInView, from, to, duration]);

  return (
    <span ref={ref}>
      {prefix}{value.toFixed(decimals)}{suffix}
    </span>
  );
};

const HeroSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const cachedCount = getCachedNodeCount();

  const { data: platformStats, isLoading } = useQuery({
    queryKey: ["platform-stats-hero"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("platform-stats");
      if (error) throw error;
      return data as {
        devices: { total: number; online: number };
        platform: { totalProviders: number };
      };
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Cache the fetched value
  useEffect(() => {
    if (platformStats?.devices?.total) {
      setCachedNodeCount(platformStats.devices.total);
    }
  }, [platformStats?.devices?.total]);

  // Get raw node count for animation
  const nodeCountRaw = platformStats?.devices?.total ?? cachedCount ?? null;

  const handleStartBuilding = () => {
    if (user) {
      navigate("/dashboard?tab=api-keys");
    } else {
      navigate("/auth?redirect=api-keys");
    }
  };

  const handleProvideCompute = () => {
    if (user) {
      navigate("/dashboard?tab=provider");
    } else {
      navigate("/auth?redirect=provider");
    }
  };

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-0 bg-gradient-radial" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />

      <div className="container relative z-10 px-4 py-20">
        <div className="text-center max-w-5xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-8">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-mono text-primary">Decentralized AI Compute</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
            <span className="text-gradient">Re</span>
            <span className="text-primary">Graph</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
            The world's cheapest AI inference & training marketplace.
            <br />
            <span className="text-foreground font-medium">Pay up to 80% less</span> than traditional cloud providers.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mb-12">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold font-mono text-primary">
                $<AnimatedNumber from={0.0009} to={0.0001} decimals={4} />
              </div>
              <div className="text-sm text-muted-foreground">per inference</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold font-mono text-primary min-w-[80px]">
                {nodeCountRaw !== null ? (
                  <>
                    <AnimatedNumber from={0} to={nodeCountRaw} decimals={0} suffix="+" />
                  </>
                ) : (
                  <span className="inline-block w-16 h-8 bg-primary/20 rounded animate-pulse" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">GPU nodes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold font-mono text-primary">
                <AnimatedNumber from={80} to={99.9} decimals={1} suffix="%" />
              </div>
              <div className="text-sm text-muted-foreground">uptime SLA</div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div
              animate={{ 
                boxShadow: [
                  "0 0 20px hsl(var(--primary) / 0.3)",
                  "0 0 40px hsl(var(--primary) / 0.5)",
                  "0 0 20px hsl(var(--primary) / 0.3)"
                ]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="rounded-md"
            >
              <Button size="lg" className="glow-primary text-lg px-8 py-6 font-semibold w-full" onClick={handleStartBuilding}>
                Start Building Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
            <Button
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6 border-border hover:border-primary/50 hover:bg-primary/5"
              onClick={handleProvideCompute}
            >
              Provide Compute
              <Server className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Device icons */}
          <div className="mt-16 flex justify-center items-center gap-8 text-muted-foreground">
            <Cpu className="h-8 w-8 animate-float" style={{ animationDelay: "0s" }} />
            <Server className="h-8 w-8 animate-float" style={{ animationDelay: "0.5s" }} />
            <Smartphone className="h-8 w-8 animate-float" style={{ animationDelay: "1s" }} />
            <Globe className="h-8 w-8 animate-float" style={{ animationDelay: "1.5s" }} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
