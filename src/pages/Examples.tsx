import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, 
  Image, 
  FileText, 
  Code2, 
  Mic, 
  Brain,
  ArrowRight,
  ExternalLink,
  Bot,
  TrendingUp,
  QrCode,
  LineChart,
  MessageCircle,
  Gamepad2,
  Sparkles,
  Layers,
  Rocket
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CodeBlock from "@/components/CodeBlock";

// Code Examples
const codeExamples = [
  {
    id: "chat-completion",
    title: "Chat Completion",
    description: "Build conversational AI applications with multi-turn dialogue support.",
    icon: MessageSquare,
    category: "Text",
    difficulty: "Beginner",
    code: `import { ReGraph } from 'regraph';

const client = new ReGraph({ apiKey: 'your-api-key' });

const response = await client.chat.completions.create({
  model: 'gpt-5',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain quantum computing in simple terms.' }
  ],
  temperature: 0.7,
  max_tokens: 500
});

console.log(response.choices[0].message.content);`,
  },
  {
    id: "image-generation",
    title: "Image Generation",
    description: "Generate stunning images from text descriptions using state-of-the-art models.",
    icon: Image,
    category: "Image",
    difficulty: "Beginner",
    code: `import { ReGraph } from 'regraph';

const client = new ReGraph({ apiKey: 'your-api-key' });

const response = await client.images.generate({
  model: 'dall-e-4',
  prompt: 'A futuristic city with flying cars at sunset',
  size: '1024x1024',
  quality: 'hd',
  n: 1
});

console.log(response.data[0].url);`,
  },
  {
    id: "text-summarization",
    title: "Text Summarization",
    description: "Summarize long documents into concise, actionable insights.",
    icon: FileText,
    category: "Text",
    difficulty: "Intermediate",
    code: `import { ReGraph } from 'regraph';

const client = new ReGraph({ apiKey: 'your-api-key' });

const longDocument = \`Your lengthy document content here...\`;

const response = await client.chat.completions.create({
  model: 'gpt-5',
  messages: [
    { 
      role: 'system', 
      content: 'You are an expert summarizer. Create concise summaries.' 
    },
    { 
      role: 'user', 
      content: \`Summarize this document in 3 bullet points:\\n\\n\${longDocument}\` 
    }
  ],
  max_tokens: 300
});

console.log(response.choices[0].message.content);`,
  },
  {
    id: "code-generation",
    title: "Code Generation",
    description: "Generate, explain, and debug code across multiple programming languages.",
    icon: Code2,
    category: "Code",
    difficulty: "Intermediate",
    code: `import { ReGraph } from 'regraph';

const client = new ReGraph({ apiKey: 'your-api-key' });

const response = await client.chat.completions.create({
  model: 'gpt-5',
  messages: [
    { 
      role: 'system', 
      content: 'You are an expert programmer. Write clean, efficient code.' 
    },
    { 
      role: 'user', 
      content: 'Write a Python function to find all prime numbers up to n using the Sieve of Eratosthenes.' 
    }
  ],
  temperature: 0.2
});

console.log(response.choices[0].message.content);`,
  },
  {
    id: "speech-to-text",
    title: "Speech to Text",
    description: "Transcribe audio files with high accuracy and speaker diarization.",
    icon: Mic,
    category: "Audio",
    difficulty: "Intermediate",
    code: `import { ReGraph } from 'regraph';
import fs from 'fs';

const client = new ReGraph({ apiKey: 'your-api-key' });

const audioFile = fs.createReadStream('meeting-recording.mp3');

const transcription = await client.audio.transcriptions.create({
  model: 'whisper-large-v3',
  file: audioFile,
  language: 'en',
  response_format: 'verbose_json',
  timestamp_granularities: ['word', 'segment']
});

console.log(transcription.text);
console.log(transcription.segments);`,
  },
  {
    id: "embeddings",
    title: "Text Embeddings",
    description: "Create vector embeddings for semantic search and RAG applications.",
    icon: Brain,
    category: "Embeddings",
    difficulty: "Advanced",
    code: `import { ReGraph } from 'regraph';

const client = new ReGraph({ apiKey: 'your-api-key' });

const texts = [
  'Machine learning is a subset of artificial intelligence.',
  'Neural networks are inspired by biological neurons.',
  'Deep learning uses multiple layers of neural networks.'
];

const response = await client.embeddings.create({
  model: 'text-embedding-3-large',
  input: texts,
  dimensions: 1536
});

// Use embeddings for semantic search
const embeddings = response.data.map(item => item.embedding);
console.log(\`Generated \${embeddings.length} embeddings\`);`,
  },
];

// Ecosystem Projects
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

const codeCategories = ["All", "Text", "Image", "Audio", "Code", "Embeddings"] as const;
type CodeCategory = typeof codeCategories[number];

const projectCategories = ["All", "AI Agents", "Analytics", "Productivity", "Payments", "Trading", "Communication", "GameDev"] as const;
type ProjectCategory = typeof projectCategories[number];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

const Examples = () => {
  const [activeCodeCategory, setActiveCodeCategory] = useState<CodeCategory>("All");
  const [activeProjectCategory, setActiveProjectCategory] = useState<ProjectCategory>("All");

  const filteredCodeExamples = useMemo(() => {
    if (activeCodeCategory === "All") return codeExamples;
    return codeExamples.filter((ex) => ex.category === activeCodeCategory);
  }, [activeCodeCategory]);

  const filteredProjects = useMemo(() => {
    if (activeProjectCategory === "All") return ecosystemProjects;
    return ecosystemProjects.filter((p) => p.category === activeProjectCategory);
  }, [activeProjectCategory]);

  return (
    <>
      <Helmet>
        <title>Examples & Ecosystem | ReGraph - Code Examples & Live Projects</title>
        <meta 
          name="description" 
          content="Explore practical code examples and live projects built on ReGraph. From API integrations to full-scale applications across DeFi, analytics, gaming, and more." 
        />
      </Helmet>
      
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-6xl">
            {/* Header */}
            <motion.div 
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="outline" className="mb-4">
                <Sparkles className="w-3 h-3 mr-1" />
                Examples & Ecosystem
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Build with <span className="text-gradient">ReGraph</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Explore code examples and discover live projects powered by our decentralized AI infrastructure.
              </p>
            </motion.div>

            {/* Tabs */}
            <Tabs defaultValue="code" className="w-full">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
                  <TabsTrigger value="code" className="flex items-center gap-2">
                    <Code2 className="w-4 h-4" />
                    Code Examples
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="flex items-center gap-2">
                    <Rocket className="w-4 h-4" />
                    Live Projects
                  </TabsTrigger>
                </TabsList>
              </motion.div>

              {/* Code Examples Tab */}
              <TabsContent value="code">
                {/* Category Filter */}
                <motion.div 
                  className="flex flex-wrap justify-center gap-2 mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {codeCategories.map((category) => (
                    <Badge 
                      key={category} 
                      variant={activeCodeCategory === category ? "default" : "secondary"}
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => setActiveCodeCategory(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </motion.div>

                {/* Code Examples Grid */}
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={activeCodeCategory}
                    className="grid gap-6"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {filteredCodeExamples.map((example) => (
                      <motion.div key={example.id} variants={itemVariants} className="min-w-0">
                        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                                  <example.icon className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <CardTitle className="text-lg sm:text-xl">{example.title}</CardTitle>
                                  <CardDescription className="mt-1 text-sm">
                                    {example.description}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <Badge variant="outline" className="text-xs">{example.category}</Badge>
                                <Badge 
                                  className="text-xs"
                                  variant={
                                    example.difficulty === "Beginner" 
                                      ? "secondary" 
                                      : example.difficulty === "Intermediate" 
                                        ? "default" 
                                        : "destructive"
                                  }
                                >
                                  {example.difficulty}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="overflow-hidden">
                            <div className="w-full overflow-x-auto">
                              <CodeBlock code={example.code} language="typescript" />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </TabsContent>

              {/* Live Projects Tab */}
              <TabsContent value="projects">
                {/* Category Filter */}
                <motion.div 
                  className="flex flex-wrap justify-center gap-2 mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {projectCategories.map((category) => (
                    <Badge 
                      key={category} 
                      variant={activeProjectCategory === category ? "default" : "secondary"}
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => setActiveProjectCategory(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </motion.div>

                {/* Projects Grid */}
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={activeProjectCategory}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {filteredProjects.map((project) => (
                      <motion.div key={project.id} variants={itemVariants} className="h-full">
                        <Card 
                          className={`h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 ${
                            project.highlight ? 'border-primary/50 bg-primary/5' : ''
                          }`}
                        >
                          <CardHeader className="flex-none">
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
                          </CardHeader>
                          <CardContent className="flex-1 flex flex-col">
                            <p className="text-sm text-muted-foreground leading-relaxed flex-1 min-h-[4.5rem]">
                              {project.description}
                            </p>
                            <div className="flex flex-wrap gap-2 my-4 min-h-[2rem]">
                              {project.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <Button 
                              variant={project.highlight ? "default" : "outline"} 
                              className="w-full group mt-auto"
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
                </AnimatePresence>

                {/* Partnership CTA */}
                <motion.div
                  className="text-center mt-12 p-8 rounded-xl bg-muted/50 border border-border"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Layers className="w-10 h-10 mx-auto mb-4 text-primary" />
                  <h3 className="text-xl font-semibold mb-2">Want to Build on ReGraph?</h3>
                  <p className="text-muted-foreground mb-4 max-w-lg mx-auto">
                    Get free compute resources, decentralized inference, and support for your project. 
                    One in a million projects succeeds — let's make yours one of them.
                  </p>
                  <Button asChild>
                    <Link to="/support">
                      Apply for Partnership
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                </motion.div>
              </TabsContent>
            </Tabs>

            {/* General CTA Section */}
            <motion.div 
              className="mt-16 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="py-12">
                  <h2 className="text-2xl font-bold mb-4">Ready to Build?</h2>
                  <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                    Get your API key and start building with ReGraph today. 
                    Access 100+ AI models with a single API.
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <Button asChild size="lg">
                      <Link to="/auth">
                        Get Started Free
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                      <Link to="/docs">
                        View Documentation
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default Examples;
