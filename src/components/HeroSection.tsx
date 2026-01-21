import { Cpu, Globe, Server, Smartphone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const HeroSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: platformStats } = useQuery({
    queryKey: ["platform-stats-hero"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("platform-stats");
      if (error) throw error;
      return data as {
        devices: { total: number; online: number };
        platform: { totalProviders: number };
      };
    },
    staleTime: 60 * 1000, // Cache for 1 minute
    refetchOnWindowFocus: false,
  });

  const formatNodeCount = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k+`;
    }
    return count > 0 ? `${count}+` : "50,000+";
  };

  const nodeCount = platformStats?.devices?.total 
    ? formatNodeCount(platformStats.devices.total)
    : "50,000+";

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
            {[
              { value: "$0.0001", label: "per inference" },
              { value: nodeCount, label: "GPU nodes" },
              { value: "99.9%", label: "uptime SLA" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold font-mono text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="glow-primary text-lg px-8 py-6 font-semibold" onClick={handleStartBuilding}>
              Start Building Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
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
