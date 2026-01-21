import { Cpu, Globe, Server, Smartphone, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const HeroSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

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
              { value: "50,000+", label: "GPU nodes" },
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

          {/* Official SDKs */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <span className="text-sm text-muted-foreground">Official SDKs available for</span>
            <div className="flex items-center gap-4">
              <a 
                href="https://github.com/ildu00/ReGraph/tree/main/sdk/python" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <svg className="h-5 w-5 text-[#3776AB]" viewBox="0 0 256 255" fill="currentColor">
                  <path d="M126.916.072c-64.832 0-60.784 28.115-60.784 28.115l.072 29.128h61.868v8.745H41.631S.145 61.355.145 126.77c0 65.417 36.21 63.097 36.21 63.097h21.61v-30.356s-1.165-36.21 35.632-36.21h61.362s34.475.557 34.475-33.319V33.97S194.67.072 126.916.072zM92.802 19.66a11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13 11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.13z"/>
                  <path d="M128.757 254.126c64.832 0 60.784-28.115 60.784-28.115l-.072-29.127H127.6v-8.745h86.441s41.486 4.705 41.486-60.712c0-65.416-36.21-63.096-36.21-63.096h-21.61v30.355s1.165 36.21-35.632 36.21h-61.362s-34.475-.557-34.475 33.32v56.013s-5.235 33.897 62.518 33.897zm34.114-19.586a11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.131 11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13z"/>
                </svg>
                <span className="font-medium">Python</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
            </div>
            <Link 
              to="/docs" 
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mt-1"
            >
              View API Documentation
              <ArrowRight className="h-3 w-3" />
            </Link>
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

