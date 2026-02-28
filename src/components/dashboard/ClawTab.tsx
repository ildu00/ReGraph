import { useState } from "react";
import AgentLibrary from "./claw/AgentLibrary";
import AgentChat from "./claw/AgentChat";
import { ClawAgent } from "./claw/AgentFormModal";

interface ClawTabProps { isMobile?: boolean; }

export default function ClawTab({ isMobile }: ClawTabProps) {
  const [activeAgent, setActiveAgent] = useState<ClawAgent | null>(null);

  if (activeAgent) {
    return <div className="flex flex-col flex-1 min-h-0"><AgentChat agent={activeAgent} onBack={() => setActiveAgent(null)} /></div>;
  }
  return <AgentLibrary onOpenChat={setActiveAgent} />;
}
