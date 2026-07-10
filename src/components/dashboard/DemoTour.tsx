import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  /** CSS selectors, tried in order until one resolves. Empty = centered. */
  selectors: string[];
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: React.ReactNode;
  /** ms to wait after switching tab so target can mount */
  settleMs?: number;
}

const STORAGE_KEY = "regraph_demo_tour_seen_v1";
const CARD_W = 340;
const GAP = 14;
const PAD = 8;

const DemoTour = ({ onNavigate, forceStart }: DemoTourProps) => {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardSize, setCardSize] = useState({ w: CARD_W, h: 240 });
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (forceStart) {
      setIndex(0);
      setOpen(true);
      return;
    }
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
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
      selectors: [],
      icon: Sparkles,
      title: "Welcome to ReGraph",
      body: (
        <p>
          Quick tour of your dashboard — less than a minute. We'll walk through
          the key areas so you know where everything lives.
        </p>
      ),
    },
    {
      tab: "overview",
      selectors: ['[data-tour="nav-overview"]', '[data-tour-tab="overview"]'],
      icon: BarChart3,
      title: "Overview",
      body: (
        <p>
          Your control center — current balance, recent spending, active API
          keys and shortcuts. Start here whenever you sign in.
        </p>
      ),
    },
    {
      tab: "chat",
      selectors: ['[data-tour="nav-chat"]', '[data-tour-tab="chat"]'],
      icon: MessageSquare,
      title: "AI Chat",
      body: (
        <p>
          A ready-to-use playground for every model on ReGraph. Open it to
          chat with GPT, Claude, Gemini, DeepSeek, Llama and more.
        </p>
      ),
      settleMs: 60,
    },
    {
      tab: "chat",
      selectors: ['[data-tour="chat-model"]'],
      icon: MessageSquare,
      title: "Pick a model & type",
      body: (
        <p>
          Choose any model from this dropdown, then type your message below.
          Attach images or files, switch models mid-conversation — each reply
          is billed from your wallet balance.
        </p>
      ),
      settleMs: 250,
    },
    {
      tab: "claw",
      selectors: ['[data-tour="nav-claw"]', '[data-tour-tab="claw"]'],
      icon: Workflow,
      title: "Claw — AI Agents",
      body: (
        <p>
          Build your own <b>agents</b>: assistants with a custom system prompt,
          a chosen model, and tools like web search, code execution, image
          generation and files. Open Claw and hit <b>Create Agent</b> to start.
        </p>
      ),
      settleMs: 60,
    },
    {
      tab: "wallet",
      selectors: ['[data-tour="nav-wallet"]', '[data-tour-tab="wallet"]'],
      icon: Wallet,
      title: "Wallet",
      body: (
        <p>
          Your USD balance lives here. Top up by card via Stripe, with crypto,
          or via Wert — the balance updates in seconds and every request is
          deducted automatically.
        </p>
      ),
      settleMs: 60,
    },
    {
      tab: "overview",
      selectors: [],
      icon: Sparkles,
      title: "You're all set",
      body: (
        <p>
          Grab an <b>API key</b> under API Keys to plug ReGraph into your own
          apps, or jump into AI Chat right now. Enjoy!
        </p>
      ),
      settleMs: 60,
    },
  ];

  const current = steps[index];

  // Navigate to the required tab whenever the step changes.
  useEffect(() => {
    if (!open || !current) return;
    onNavigate(current.tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index]);

  // Locate the target element and track its rect.
  useLayoutEffect(() => {
    if (!open || !current) return;
    let cancelled = false;



    const findRect = (): DOMRect | null => {
      for (const sel of current.selectors) {
        const els = Array.from(
          document.querySelectorAll<HTMLElement>(sel),
        ).filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
        if (els.length) return els[0].getBoundingClientRect();
      }
      return null;
    };

    const update = () => {
      if (cancelled) return;
      const r = findRect();
      setRect((prev) => {
        if (!prev && !r) return prev;
        if (prev && r &&
            prev.top === r.top && prev.left === r.left &&
            prev.width === r.width && prev.height === r.height) return prev;
        return r;
      });
    };

    // Retry a few times for elements that mount after a tab switch.
    const deadline = Date.now() + (current.settleMs ?? 0) + 400;
    let timer = 0;
    const poll = () => {
      if (cancelled) return;
      update();
      const r = findRect();
      if (!r && current.selectors.length && Date.now() < deadline) {
        timer = window.setTimeout(poll, 80);
      }
    };
    poll();

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index]);

  // Track card height for smart positioning.
  useLayoutEffect(() => {
    if (cardRef.current) {
      const r = cardRef.current.getBoundingClientRect();
      setCardSize({ w: r.width, h: r.height });
    }
  }, [index, rect, open]);

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const next = () =>
    index < steps.length - 1 ? setIndex(index + 1) : finish();
  const back = () => index > 0 && setIndex(index - 1);

  if (!open || !current) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  // Compute card position + spotlight box.
  let cardStyle: React.CSSProperties;
  let placement: "top" | "bottom" | "left" | "right" | "center" = "center";
  let spotlight: { top: number; left: number; width: number; height: number } | null = null;

  if (rect) {
    const padded = {
      top: rect.top - PAD,
      left: rect.left - PAD,
      width: rect.width + PAD * 2,
      height: rect.height + PAD * 2,
    };
    spotlight = padded;

    const spaceRight = vw - (rect.right + GAP);
    const spaceLeft = rect.left - GAP;
    const spaceBottom = vh - (rect.bottom + GAP);
    const spaceTop = rect.top - GAP;

    if (spaceRight >= CARD_W + 16) placement = "right";
    else if (spaceLeft >= CARD_W + 16) placement = "left";
    else if (spaceBottom >= cardSize.h + 16) placement = "bottom";
    else if (spaceTop >= cardSize.h + 16) placement = "top";
    else placement = "bottom";

    const w = Math.min(CARD_W, vw - 24);
    let top = 0;
    let left = 0;
    if (placement === "right") {
      left = rect.right + GAP;
      top = rect.top + rect.height / 2 - cardSize.h / 2;
    } else if (placement === "left") {
      left = rect.left - GAP - w;
      top = rect.top + rect.height / 2 - cardSize.h / 2;
    } else if (placement === "bottom") {
      top = rect.bottom + GAP;
      left = rect.left + rect.width / 2 - w / 2;
    } else if (placement === "top") {
      top = rect.top - GAP - cardSize.h;
      left = rect.left + rect.width / 2 - w / 2;
    }
    top = Math.max(12, Math.min(top, vh - cardSize.h - 12));
    left = Math.max(12, Math.min(left, vw - w - 12));

    cardStyle = { position: "fixed", top, left, width: w };
  } else {
    cardStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      width: Math.min(CARD_W, vw - 24),
      transform: "translate(-50%, -50%)",
    };
  }

  const Icon = current.icon;
  const isLast = index === steps.length - 1;

  const overlay = (
    <AnimatePresence>
      <motion.div
        key="demo-root"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] pointer-events-none"
      >
        {spotlight ? (
          <>
            {/* Four dim panels around the spotlight — no blur, no coverage over target */}
            <div
              className="absolute bg-background/75 pointer-events-auto"
              style={{ top: 0, left: 0, right: 0, height: spotlight.top }}
              onClick={finish}
            />
            <div
              className="absolute bg-background/75 pointer-events-auto"
              style={{
                top: spotlight.top + spotlight.height,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              onClick={finish}
            />
            <div
              className="absolute bg-background/75 pointer-events-auto"
              style={{
                top: spotlight.top,
                left: 0,
                width: spotlight.left,
                height: spotlight.height,
              }}
              onClick={finish}
            />
            <div
              className="absolute bg-background/75 pointer-events-auto"
              style={{
                top: spotlight.top,
                left: spotlight.left + spotlight.width,
                right: 0,
                height: spotlight.height,
              }}
              onClick={finish}
            />
            {/* Highlight ring */}
            <motion.div
              key={`ring-${index}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="absolute rounded-md ring-2 ring-primary pointer-events-none"
              style={{
                top: spotlight.top,
                left: spotlight.left,
                width: spotlight.width,
                height: spotlight.height,
                boxShadow: "0 0 0 4px hsl(var(--primary) / 0.25), 0 0 32px hsl(var(--primary) / 0.35)",
              }}
            />
          </>
        ) : (
          <div
            className="absolute inset-0 bg-background/75 pointer-events-auto"
            onClick={finish}
          />
        )}

        <motion.div
          key={`card-${index}`}
          ref={cardRef}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={cardStyle}
          className="pointer-events-auto bg-card border border-border rounded-md shadow-2xl p-5"
        >
          <button
            type="button"
            onClick={finish}
            aria-label="Skip tour"
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 mb-3 pr-6">
            <div className="h-9 w-9 shrink-0 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Step {index + 1} of {steps.length}
              </div>
              <h3 className="text-base font-semibold leading-tight truncate">
                {current.title}
              </h3>
            </div>
          </div>

          <div className="text-sm text-foreground/90 leading-relaxed">
            {current.body}
          </div>

          <div className="flex items-center gap-1 mt-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === index
                    ? "w-5 bg-primary"
                    : i < index
                      ? "w-2.5 bg-primary/50"
                      : "w-2.5 bg-border"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={finish}
              className="text-muted-foreground h-8"
            >
              Skip
            </Button>
            <div className="flex gap-2">
              {index > 0 && (
                <Button variant="outline" size="sm" onClick={back} className="h-8">
                  Back
                </Button>
              )}
              <Button size="sm" onClick={next} className="h-8 glow-primary">
                {isLast ? "Get started" : "Next"}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
};

export default DemoTour;
