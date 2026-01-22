import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  MessageSquare, 
  Image, 
  FileText, 
  Code2, 
  Mic, 
  Brain,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CodeBlock from "@/components/CodeBlock";

const examples = [
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
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

const Examples = () => {
  return (
    <>
      <Helmet>
        <title>Examples | ReGraph - AI API Code Examples</title>
        <meta 
          name="description" 
          content="Explore practical code examples for ReGraph API. Learn how to implement chat completions, image generation, embeddings, and more." 
        />
      </Helmet>
      
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-6xl">
            {/* Header */}
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="outline" className="mb-4">
                Code Examples
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Build with <span className="text-gradient">ReGraph</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Explore practical examples to get started with the ReGraph API. 
                From simple chat completions to advanced embeddings — we've got you covered.
              </p>
            </motion.div>

            {/* Quick Links */}
            <motion.div 
              className="flex flex-wrap justify-center gap-3 mb-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {["Text", "Image", "Audio", "Code", "Embeddings"].map((category) => (
                <Badge 
                  key={category} 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {category}
                </Badge>
              ))}
            </motion.div>

            {/* Examples Grid */}
            <motion.div 
              className="grid gap-8"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {examples.map((example) => (
                <motion.div key={example.id} variants={itemVariants}>
                  <Card className="overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <example.icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-xl">{example.title}</CardTitle>
                            <CardDescription className="mt-1">
                              {example.description}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">{example.category}</Badge>
                          <Badge 
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
                    <CardContent>
                      <CodeBlock code={example.code} language="typescript" />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Section */}
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
