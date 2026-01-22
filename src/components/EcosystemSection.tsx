import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bot, 
  TrendingUp, 
  FileText, 
  QrCode, 
  LineChart, 
  MessageCircle, 
  Gamepad2,
  ExternalLink,
  Sparkles
} from "lucide-react";

const ecosystemProjects = [
  {
    id: "spoonos",
    name: "SpoonOS",
    category: "AI Agents",
    description: "Industry-specific platform for creating DeFi AI agents in partnership with NEO blockchain. Free resources and compute power for builders — we take 50% equity in successful projects.",
    url: "https://spoonos.online/",
    icon: Bot,
    tags: ["DeFi", "Agents", "NEO"],
    highlight: true,
  },
  {
    id: "cryptopulse",
    name: "CryptoPulse Live",
    category: "Analytics",
    description: "Real-time sentiment analysis of news around crypto tickers. Track market mood and make data-driven decisions with AI-powered insights.",
    url: "https://cryptopulselive.online/",
    icon: TrendingUp,
    tags: ["Sentiment", "News", "Crypto"],
  },
  {
    id: "voiceflow",
    name: "Voice Flow",
    category: "Productivity",
    description: "Voice and multi-modal document management for Google Docs. Analyze, modify, and automate document workflows using text, voice, or AI agents.",
    url: "https://voice-flow.online/",
    icon: FileText,
    tags: ["Voice", "Documents", "Automation"],
  },
  {
    id: "qrwalletpay",
    name: "QR Wallet Pay",
    category: "Payments",
    description: "QR-based payments with cryptocurrency wallet top-ups. Enabling barter-based transactions where crypto is exchanged directly for goods.",
    url: "https://qrwalletpay.ru/",
    icon: QrCode,
    tags: ["Payments", "QR", "Crypto"],
  },
  {
    id: "tickerone",
    name: "Ticker One",
    category: "Trading",
    description: "AI-powered cryptocurrency exchange extending 3commas concepts. Features include AI trading bots and DEX/CEX arbitrage strategies.",
    url: "https://tickerone.online/",
    icon: LineChart,
    tags: ["Trading", "AI Bots", "Arbitrage"],
  },
  {
    id: "darkecho",
    name: "Dark Echo",
    category: "Communication",
    description: "Privacy-first messenger with built-in AI. Create video or voice calls via link without registration. Expandable with AI features like auto-replies and summarization.",
    url: "https://darkecho.space/",
    icon: MessageCircle,
    tags: ["Messenger", "Privacy", "AI"],
  },
  {
    id: "gameagents",
    name: "Game Agents",
    category: "GameDev",
    description: "AI agents for game development — create locations, characters, rewards, and quests in one place. Two-click API integration for any game type.",
    url: "https://gameagents.online/",
    icon: Gamepad2,
    tags: ["GameDev", "Agents", "API"],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const EcosystemSection = () => {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="container px-4">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge variant="outline" className="mb-4">
            <Sparkles className="w-3 h-3 mr-1" />
            Ecosystem
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built on ReGraph
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Discover innovative projects leveraging our decentralized AI infrastructure 
            for real-world applications across industries.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {ecosystemProjects.map((project) => (
            <motion.div key={project.id} variants={itemVariants}>
              <Card 
                className={`h-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 ${
                  project.highlight ? 'border-primary/50 bg-primary/5' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`p-2.5 rounded-lg ${
                      project.highlight 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      <project.icon className="w-5 h-5" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {project.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl mt-3">{project.name}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {project.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button 
                    variant={project.highlight ? "default" : "outline"} 
                    className="w-full group"
                    asChild
                  >
                    <a href={project.url} target="_blank" rel="noopener noreferrer">
                      Visit Project
                      <ExternalLink className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-muted-foreground mb-4">
            Want to build on ReGraph? Get free compute resources and support.
          </p>
          <Button variant="outline" size="lg" asChild>
            <a href="/support">
              Apply for Partnership
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default EcosystemSection;
