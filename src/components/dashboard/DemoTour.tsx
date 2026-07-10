import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  MessageSquare,
  Workflow,
  Wallet,
  Sparkles,
  X,
} from "lucide-react";

interface DemoTourProps {
  onNavigate: (tab: string) => void;
  forceStart?: boolean;
}

interface Step {
  tab: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: React.ReactNode;
}

const STORAGE_KEY = "regraph_demo_tour_seen_v1";

const DemoTour = ({ onNavigate, forceStart }: DemoTourProps) => {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (forceStart) {
      setIndex(0);
      setOpen(true);
      return;
    }
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        setIndex(0);
        setOpen(true);
      }
    } catch {
      /* ignore */
    }
  }, [forceStart]);

  const steps: Step[] = [
    {
      tab: "overview",
      icon: Sparkles,
      title: "Welcome to ReGraph",
      body: (
        <>
          <p>
            Let's take a quick tour of your dashboard. It takes less than a
            minute — you'll learn where everything lives and how to get started.
          </p>
          <p className="text-muted-foreground text-sm">
            You can reopen this tour anytime by visiting{" "}
            <code className="text-foreground">/dashboard?demo=1</code>.
          </p>
        </>
      ),
    },
    {
      tab: "overview",
      icon: BarChart3,
      title: "Overview",
      body: (
        <>
          <p>
            The <b>Overview</b> tab is your control center: current balance,
            recent spending, active API keys, and quick shortcuts to everything
            else.
          </p>
          <p className="text-muted-foreground text-sm">
            Start here whenever you sign in — it shows account health at a
            glance.
          </p>
        </>
      ),
    },
    {
      tab: "chat",
      icon: MessageSquare,
      title: "AI Chat",
      body: (
        <>
          <p>
            <b>AI Chat</b> is a ready-to-use playground for every model on
            ReGraph. Pick a model from the dropdown at the top — GPT, Claude,
            Gemini, DeepSeek, Llama and more — then just type your message.
          </p>
          <p className="text-muted-foreground text-sm">
            Attach images or files, switch models mid-conversation, and each
            reply is billed straight from your wallet balance.
          </p>
        </>
      ),
    },
    {
      tab: "claw",
      icon: Workflow,
      title: "Claw — AI Agents",
      body: (
        <>
          <p>
            <b>Claw</b> lets you build AI <b>agents</b>: assistants with a
            custom system prompt, a chosen model, and tools like web search,
            code execution, image generation and file handling.
          </p>
          <p className="text-muted-foreground text-sm">
            Click <b>Create Agent</b>, give it a name and instructions, pick a
            model, enable the tools it needs — and chat with it or connect it
            to Telegram.
          </p>
        </>
      ),
    },
    {
      tab: "wallet",
      icon: Wallet,
      title: "Wallet",
      body: (
        <>
          <p>
            The <b>Wallet</b> holds your USD balance. Every request through AI
            Chat, Claw or the API is deducted from here.
          </p>
          <p className="text-muted-foreground text-sm">
            Top up with a card via Stripe, with crypto, or via Wert — pick any
            amount and the balance updates in seconds.
          </p>
        </>
      ),
    },
    {
      tab: "overview",
      icon: Sparkles,
      title: "You're all set",
      body: (
        <>
          <p>
            That's it! Grab an <b>API key</b> under the API Keys tab to plug
            ReGraph into your own apps, or jump into AI Chat right now.
          </p>
          <p className="text-muted-foreground text-sm">
            Need help? Check the docs or use the support chat in the bottom
            corner.
          </p>
        </>
      ),
    },
  ];

  const current = steps[index];

  useEffect(() => {
    if (open && current) {
      onNavigate(current.tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index]);

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const next = () => {
    if (index < steps.length - 1) {
      setIndex(index + 1);
    } else {
      finish();
    }
  };

  const back = () => {
    if (index > 0) setIndex(index - 1);
  };

  if (!open || !current) return null;

  const Icon = current.icon;
  const isLast = index === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        key="demo-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background/70 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          key={`demo-card-${index}`}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-card border border-border rounded-md shadow-2xl glow-primary p-6 relative"
        >
          <button
            type="button"
            onClick={finish}
            aria-label="Skip tour"
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Step {index + 1} of {steps.length}
              </div>
              <h3 className="text-lg font-semibold">{current.title}</h3>
            </div>
          </div>

          <div className="space-y-3 text-sm text-foreground/90">
            {current.body}
          </div>

          <div className="flex items-center gap-1.5 mt-5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === index
                    ? "w-6 bg-primary"
                    : i < index
                      ? "w-3 bg-primary/50"
                      : "w-3 bg-border"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mt-5">
            <Button
              variant="ghost"
              size="sm"
              onClick={finish}
              className="text-muted-foreground"
            >
              Skip
            </Button>
            <div className="flex gap-2">
              {index > 0 && (
                <Button variant="outline" size="sm" onClick={back}>
                  Back
                </Button>
              )}
              <Button size="sm" onClick={next} className="glow-primary">
                {isLast ? "Get started" : "Next"}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DemoTour;
