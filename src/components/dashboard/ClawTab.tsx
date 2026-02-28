import { useState } from "react";
import AgentLibrary from "./claw/AgentLibrary";
import AgentChat from "./claw/AgentChat";
import { ClawAgent } from "./claw/AgentFormModal";

export default function ClawTab() {
  const [activeAgent, setActiveAgent] = useState<ClawAgent | null>(null);

  if (activeAgent) {
    return <AgentChat agent={activeAgent} onBack={() => setActiveAgent(null)} />;
  }
  return <AgentLibrary onOpenChat={setActiveAgent} />;
}
