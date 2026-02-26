import { Helmet } from "react-helmet-async";
import { ExternalLink, Trophy, Clock, CheckCircle2, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Competition {
  id: string;
  title: string;
  platform: string;
  platformUrl: string;
  description: string;
  status: "active" | "upcoming" | "completed";
  category: string;
  spaceUrl?: string;
  details: string[];
}

const competitions: Competition[] = [
  {
    id: "hf-regraph-llm",
    title: "ReGraph LLM — HuggingFace Space",
    platform: "Hugging Face",
    platformUrl: "https://huggingface.co/spaces/Regraph/ReGraphLLM",
    spaceUrl: "https://huggingface.co/spaces/Regraph/ReGraphLLM",
    description:
      "An interactive demo Space on Hugging Face showcasing ReGraph LLM inference capabilities. Users can test the model directly in the browser via a Gradio interface, comparing response quality and latency against other open-source models.",
    status: "active",
    category: "LLM Benchmark",
    details: [
      "Live Gradio-powered inference demo",
      "Accessible directly in the browser — no API key required",
      "Showcases decentralized compute routing under the hood",
      "Continuously updated as new model checkpoints are released",
    ],
  },
];

const statusConfig = {
  active: {
    label: "Active",
    icon: CheckCircle2,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  upcoming: {
    label: "Upcoming",
    icon: Clock,
    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  completed: {
    label: "Completed",
    icon: Trophy,
    className: "bg-muted text-muted-foreground border-border",
  },
};

const Competitions = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Competitions & Benchmarks — ReGraph</title>
        <meta
          name="description"
          content="ReGraph participates in AI competitions, benchmarks, and public demos to validate our decentralized compute approach."
        />
      </Helmet>

      <Navbar />

      <main className="flex-1 pt-24 pb-20">
        <div className="container px-4 max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                Public Benchmarks
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Competitions &amp; Benchmarks
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              We actively participate in public AI benchmarks, competitions, and
              community demos to validate our technology and stay accountable to
              the broader research community.
            </p>
          </div>

          {/* Stats row */}
          <div className="flex gap-4 mb-12">
            <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <Trophy className="h-4 w-4 text-primary shrink-0" />
              <div>
                <div className="text-xl font-bold text-primary leading-none">
                  {competitions.length}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Total entries
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <div>
                <div className="text-xl font-bold text-primary leading-none">
                  {competitions.filter((c) => c.status === "active").length}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Active now
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <Cpu className="h-4 w-4 text-primary shrink-0" />
              <div>
                <div className="text-xl font-bold text-primary leading-none">
                  1
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Platforms
                </div>
              </div>
            </div>
          </div>

          {/* Competition cards */}
          <div className="space-y-6">
            {competitions.map((comp) => {
              const status = statusConfig[comp.status];
              const StatusIcon = status.icon;
              return (
                <div
                  key={comp.id}
                  className="rounded-2xl border border-border bg-card p-6 md:p-8 hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {comp.category}
                        </Badge>
                      </div>
                      <h2 className="text-xl font-bold mb-1">{comp.title}</h2>
                      <a
                        href={comp.platformUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {comp.platform}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    {comp.spaceUrl && (
                      <Button asChild size="sm" className="shrink-0">
                        <a
                          href={comp.spaceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Space
                        </a>
                      </Button>
                    )}
                  </div>

                  <p className="text-muted-foreground mb-5 leading-relaxed">
                    {comp.description}
                  </p>

                  <ul className="space-y-2">
                    {comp.details.map((detail, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="mt-12 rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
            <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-2">More benchmarks coming soon</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              We're preparing submissions for additional leaderboards and
              competitions. Check back regularly for updates.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Competitions;
