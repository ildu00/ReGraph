import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Bot, Search, Code2, FileText, Globe, Zap, Brain, Layers,
  ArrowRight, Shield, Clock, Sparkles, Terminal, MessageSquare,
  Database, Network, Cpu, FlaskConical, GitBranch, Mail,
  BarChart2, Calendar, Image, Mic, PlugZap,
} from "lucide-react";

const currentTools = [
  {
    icon: Search,
    name: "Real-time Web Search",
    description: "Powered by Firecrawl. Agents can browse the live web, retrieve news, docs, and any URL in real time.",
    status: "live",
  },
  {
    icon: Code2,
    name: "Code Interpreter",
    description: "Sandboxed multi-language runtime via Judge0 CE. Run Python, JavaScript, TypeScript, C++, Go, Ruby, and more.",
    status: "live",
  },
  {
    icon: FileText,
    name: "Document Reader",
    description: "Parse and extract content from PDFs, Word docs, spreadsheets, and plain text files uploaded by the user.",
    status: "live",
  },
  {
    icon: Globe,
    name: "Browser Interaction",
    description: "Navigate web pages, read rendered HTML, extract structured data, and interact with dynamic content.",
    status: "live",
  },
  {
    icon: Terminal,
    name: "Calculator & REPL",
    description: "Built-in expression evaluator for mathematical computations and quick script testing inside the agent loop.",
    status: "live",
  },
];

const plannedTools = [
  {
    icon: Database,
    name: "Long-term Memory",
    description: "Persistent vector memory store. Agents remember past conversations and facts across sessions.",
    eta: "Q2 2026",
  },
  {
    icon: Mail,
    name: "Email & Calendar",
    description: "Send emails, create calendar events, and read inbox items via OAuth-connected accounts.",
    eta: "Q2 2026",
  },
  {
    icon: Network,
    name: "API Connector",
    description: "Call any external REST API. Define custom tools with OpenAPI schema and let agents use them autonomously.",
    eta: "Q3 2026",
  },
  {
    icon: Image,
    name: "Image Generation",
    description: "Generate and edit images using ReGraph's multi-modal models directly inside the agent workflow.",
    eta: "Q3 2026",
  },
  {
    icon: Mic,
    name: "Voice Input / Output",
    description: "Speak to agents and receive spoken responses. Full audio pipeline with real-time transcription.",
    eta: "Q3 2026",
  },
  {
    icon: GitBranch,
    name: "Multi-agent Orchestration",
    description: "Spawn sub-agents, delegate tasks, and run parallel reasoning pipelines inside a single workflow.",
    eta: "Q4 2026",
  },
  {
    icon: FlaskConical,
    name: "Experiment Tracking",
    description: "Log model outputs, compare runs, and evaluate agent performance over time with built-in metrics.",
    eta: "Q4 2026",
  },
  {
    icon: PlugZap,
    name: "Third-party Integrations",
    description: "Native connectors for Notion, GitHub, Slack, Google Drive, and more — no code required.",
    eta: "2027",
  },
];

const benefits = [
  {
    icon: Zap,
    title: "No Infrastructure",
    description: "Claw agents run on ReGraph's decentralized compute network. Zero DevOps, zero Docker, zero cloud bills.",
  },
  {
    icon: Brain,
    title: "Fully Customizable",
    description: "Define agent identity, capabilities, and constraints through system prompts and a curated tool library.",
  },
  {
    icon: Layers,
    title: "Multi-tool Reasoning",
    description: "Agents autonomously decide which tools to call, chain them together, and synthesize a final answer.",
  },
  {
    icon: Shield,
    title: "Sandboxed Execution",
    description: "Every tool call runs in an isolated environment. No cross-user data leakage, no side effects on your system.",
  },
  {
    icon: Clock,
    title: "Persistent Conversations",
    description: "Full conversation history stored per agent. Pick up where you left off — context never gets lost.",
  },
  {
    icon: Sparkles,
    title: "ReGraph LLM Powered",
    description: "Default model is the in-house ReGraph LLM running on decentralized GPUs — fast, private, and affordable.",
  },
];

const useCases = [
  {
    icon: Search,
    title: "Research Assistant",
    description: "Search the web, read papers, summarize findings, and generate structured reports — fully automated.",
  },
  {
    icon: BarChart2,
    title: "Data Analyst",
    description: "Upload a CSV, ask questions in plain English. The agent writes and executes code to produce charts and insights.",
  },
  {
    icon: Terminal,
    title: "Dev Companion",
    description: "Debug code, write tests, explain architecture, and fetch live docs — all without leaving your workflow.",
  },
  {
    icon: MessageSquare,
    title: "Content Creator",
    description: "Research topics, draft long-form content, adapt tone, and format for blogs, docs, or social media.",
  },
];

const Claw = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>ReGraph Claw — Managed AI Agent Builder</title>
        <meta name="description" content="Build and deploy autonomous AI agents with real-world tools. Claw by ReGraph runs on decentralized compute — no infra, no DevOps." />
        <link rel="canonical" href="https://regraph.tech/claw" />
      </Helmet>
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-primary/8 rounded-full blur-3xl pointer-events-none" />

        <div className="container relative z-10 px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-sm font-mono text-primary">ReGraph Claw</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Autonomous Agents,<br />
              <span className="text-gradient-primary">Zero Infra</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10">
              Claw is ReGraph's managed AI agent platform. Create agents with real-world skills — web search, code execution, document analysis — and run them on decentralized compute.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/dashboard">
                <Button size="lg" className="glow-primary text-base px-8">
                  <Zap className="mr-2 h-5 w-5" />
                  Build Your Agent
                </Button>
              </Link>
              <Link to="/docs">
                <Button variant="outline" size="lg" className="border-primary/30 hover:bg-primary/10 text-base px-8">
                  Read the Docs →
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Current Tools */}
      <section className="py-20">
        <div className="container px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Available Skills Today</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every Claw agent has access to a production-ready tool ecosystem from day one.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentTools.map((tool, i) => (
              <motion.div
                key={tool.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group p-6 rounded-xl bg-card/50 border border-border hover:border-primary/30 hover:bg-card transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <tool.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{tool.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Live</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{tool.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-card/20">
        <div className="container px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Claw?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A platform built for speed, privacy, and real-world usefulness — not just demos.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="p-6 rounded-xl bg-card border border-border"
              >
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20">
        <div className="container px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Can Agents Do?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From research to development — Claw agents tackle real work autonomously.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {useCases.map((uc, i) => (
              <motion.div
                key={uc.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-6 rounded-xl bg-card/50 border border-border hover:border-primary/30 hover:bg-card transition-all duration-300 text-center"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                  <uc.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{uc.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{uc.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="py-20 bg-card/20">
        <div className="container px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-4">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-mono text-accent">Coming Soon</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Planned Skills & Integrations</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The Claw skill ecosystem is expanding fast. Here's what's on the roadmap.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {plannedTools.map((tool, i) => (
              <motion.div
                key={tool.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="p-5 rounded-xl bg-card/30 border border-border/60 hover:border-accent/20 transition-all duration-300"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <tool.icon className="h-5 w-5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">{tool.name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{tool.eta}</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Start Building with <span className="text-gradient-primary">Claw</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Create your first autonomous agent in minutes. No credit card required for the free tier.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/dashboard">
                <Button size="lg" className="glow-primary text-base px-8">
                  <Bot className="mr-2 h-5 w-5" />
                  Open Claw Dashboard
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" size="lg" className="border-primary/30 hover:bg-primary/10 text-base px-8">
                  Create Free Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Claw;
