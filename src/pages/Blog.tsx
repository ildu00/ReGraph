import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, ArrowRight, X } from "lucide-react";

// Blog images
import decentralizedAiImg from "@/assets/blog/decentralized-ai.jpg";
import gpt5ReasoningImg from "@/assets/blog/gpt5-reasoning.jpg";
import geminiMultimodalImg from "@/assets/blog/gemini-multimodal.jpg";
import aiBestPracticesImg from "@/assets/blog/ai-best-practices.jpg";
import providerMilestoneImg from "@/assets/blog/provider-milestone.jpg";
import aiBenchmarksImg from "@/assets/blog/ai-benchmarks.jpg";
import smallModelsImg from "@/assets/blog/small-models.jpg";
import batchProcessingImg from "@/assets/blog/batch-processing.jpg";
import aiEthicsImg from "@/assets/blog/ai-ethics.jpg";
import gettingStartedImg from "@/assets/blog/getting-started.jpg";
import platformLaunchImg from "@/assets/blog/platform-launch.jpg";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  readTime: string;
  category: string;
  image: string;
  featured?: boolean;
}

const blogPosts: BlogPost[] = [
  {
    id: "1",
    title: "The Future of Decentralized AI Inference",
    excerpt: "How distributed computing is reshaping the AI landscape and why ReGraph is at the forefront of this revolution.",
    content: `The AI industry is undergoing a fundamental transformation. As models grow larger and more capable, the centralized infrastructure that powers them is struggling to keep up with demand. This is where decentralized AI inference comes in.

**The Problem with Centralized AI**

Traditional AI infrastructure relies on massive data centers owned by a handful of tech giants. This creates several issues:
- High costs that get passed on to developers
- Single points of failure
- Geographic limitations and latency issues
- Limited access for smaller organizations

**ReGraph's Decentralized Approach**

At ReGraph, we're building a distributed network of compute providers that includes everything from enterprise GPUs to consumer devices. This approach offers:

1. **Cost Efficiency**: By utilizing idle compute resources, we can offer inference at a fraction of traditional costs.
2. **Resilience**: No single point of failure means higher uptime and reliability.
3. **Global Coverage**: Providers worldwide mean lower latency for users everywhere.
4. **Democratized Access**: Anyone can access powerful AI models without massive infrastructure investments.

**Looking Ahead**

As we enter 2026, the demand for AI compute will only grow. Decentralized networks like ReGraph are positioned to meet this demand while keeping AI accessible to everyone.`,
    date: "2026-01-11",
    readTime: "5 min",
    category: "Industry Insights",
    image: decentralizedAiImg,
    featured: true
  },
  {
    id: "2",
    title: "GPT-5 and the New Era of Reasoning Models",
    excerpt: "OpenAI's latest model brings unprecedented reasoning capabilities. Here's what it means for developers.",
    content: `OpenAI's GPT-5 represents a significant leap in AI capabilities, particularly in reasoning and complex problem-solving.

**What Makes GPT-5 Different**

Unlike its predecessors, GPT-5 demonstrates:
- Enhanced multi-step reasoning
- Improved accuracy on complex mathematical problems
- Better understanding of nuanced context
- More reliable code generation

**Performance on ReGraph**

Since adding GPT-5 to our model catalog, we've seen remarkable adoption. Developers are using it for:
- Complex data analysis pipelines
- Advanced code review and generation
- Scientific research assistance
- Legal document analysis

**Cost Considerations**

While GPT-5 is more expensive per token than smaller models, its improved accuracy often means fewer iterations and corrections, potentially lowering total costs for complex tasks.

**Best Practices**

When using GPT-5 through ReGraph:
1. Use it for tasks that require deep reasoning
2. Consider GPT-5-mini for simpler tasks to optimize costs
3. Leverage our batch processing API for large workloads`,
    date: "2026-01-08",
    readTime: "4 min",
    category: "Models",
    image: gpt5ReasoningImg
  },
  {
    id: "3",
    title: "Gemini 3 Pro: Google's Next-Gen Multimodal AI",
    excerpt: "Google's Gemini 3 Pro brings impressive improvements in multimodal understanding and generation.",
    content: `Google's Gemini 3 Pro represents the next evolution in multimodal AI, building on the strong foundation of Gemini 2.5.

**Key Improvements**

Gemini 3 Pro offers significant advances:
- **Better Vision Understanding**: More accurate image analysis and object recognition
- **Improved Reasoning**: Enhanced logical reasoning across modalities
- **Faster Response Times**: Optimized architecture for lower latency
- **Extended Context**: Handle longer documents and conversations

**Image Generation with Gemini 3**

The new Gemini 3 Pro Image Preview model offers:
- Higher resolution outputs
- Better prompt adherence
- More consistent style across generations
- Improved handling of complex scenes

**Integration with ReGraph**

We've fully integrated Gemini 3 Pro into our inference pipeline. Developers can access it through our standard API with no additional configuration required.

**Use Cases**

Popular applications include:
- Document analysis and OCR
- Visual content moderation
- Creative image generation
- Multimodal chatbots`,
    date: "2026-01-05",
    readTime: "4 min",
    category: "Models",
    image: geminiMultimodalImg
  },
  {
    id: "4",
    title: "Building AI Applications: Best Practices for 2026",
    excerpt: "Essential patterns and practices for developing robust AI-powered applications in the modern era.",
    content: `As AI becomes more integrated into software applications, developers need to adopt best practices that ensure reliability, cost-efficiency, and user satisfaction.

**1. Model Selection Strategy**

Not every task requires the most powerful model:
- Use lightweight models (GPT-5-nano, Gemini Flash Lite) for simple classifications
- Reserve powerful models for complex reasoning tasks
- Implement fallback chains for reliability

**2. Prompt Engineering**

Effective prompts are crucial:
- Be specific and provide context
- Use structured output formats (JSON)
- Include examples when possible
- Test and iterate systematically

**3. Error Handling**

AI systems can fail in unexpected ways:
- Implement graceful degradation
- Add retry logic with exponential backoff
- Monitor for quality degradation over time
- Have human review processes for critical decisions

**4. Cost Management**

Control your AI spending:
- Cache responses when appropriate
- Batch similar requests together
- Use streaming for long responses
- Monitor token usage closely

**5. Security Considerations**

Protect your AI applications:
- Never expose API keys client-side
- Validate and sanitize AI outputs
- Implement rate limiting
- Monitor for prompt injection attacks`,
    date: "2025-12-28",
    readTime: "6 min",
    category: "Development",
    image: aiBestPracticesImg
  },
  {
    id: "5",
    title: "ReGraph Network: 10,000 Active Providers Milestone",
    excerpt: "Our decentralized compute network reaches a major milestone with providers spanning 50+ countries.",
    content: `We're thrilled to announce that ReGraph has reached 10,000 active compute providers on our network!

**Global Reach**

Our provider network now spans:
- 50+ countries across 6 continents
- Over 15,000 GPUs available for inference
- 2,500+ TPU and NPU devices
- Growing smartphone compute network

**What This Means for Developers**

With our expanded network:
- **Lower Latency**: Regional providers mean faster responses
- **Higher Availability**: More redundancy for critical workloads
- **Better Pricing**: Competition drives costs down
- **More Capacity**: Handle larger batch jobs efficiently

**Provider Success Stories**

We've seen incredible stories from our providers:
- Research labs monetizing idle GPU time
- Gaming cafes earning during off-hours
- Data centers adding new revenue streams
- Individual enthusiasts contributing to AI accessibility

**Looking Forward**

Our goal for 2026 is to reach 50,000 providers and add support for new hardware types including the latest NVIDIA and AMD GPUs.`,
    date: "2025-12-20",
    readTime: "3 min",
    category: "Company News",
    image: providerMilestoneImg
  },
  {
    id: "6",
    title: "Understanding AI Model Benchmarks",
    excerpt: "A comprehensive guide to interpreting AI model benchmarks and choosing the right model for your needs.",
    content: `With dozens of AI models available, understanding benchmarks is essential for making informed choices.

**Common Benchmark Categories**

**Reasoning Benchmarks**
- MMLU (Massive Multitask Language Understanding)
- ARC (AI2 Reasoning Challenge)
- HellaSwag
- GSM8K (Grade School Math)

**Coding Benchmarks**
- HumanEval
- MBPP (Mostly Basic Python Problems)
- CodeContests

**Multimodal Benchmarks**
- MMMU (Massive Multi-discipline Multimodal Understanding)
- VQAv2 (Visual Question Answering)
- TextVQA

**Beyond Benchmarks**

While benchmarks are useful, they don't tell the whole story:
- Real-world performance may differ
- Latency and cost matter too
- Some tasks don't have good benchmarks
- Model behavior on edge cases varies

**Practical Recommendations**

1. Start with a model known for your use case
2. Run your own evaluation on representative tasks
3. Consider the cost-performance tradeoff
4. Test with real users when possible
5. Monitor performance over time`,
    date: "2025-12-15",
    readTime: "5 min",
    category: "Education",
    image: aiBenchmarksImg
  },
  {
    id: "7",
    title: "The Rise of Small Language Models",
    excerpt: "Why smaller, specialized models are becoming increasingly important in the AI ecosystem.",
    content: `While headlines focus on ever-larger models, there's a quiet revolution happening with smaller, more efficient AI models.

**Why Small Models Matter**

**Cost Efficiency**
- 10-100x cheaper per request
- Sustainable for high-volume applications
- Accessible to startups and individuals

**Speed**
- Millisecond response times
- Better for real-time applications
- Improved user experience

**Deployment Flexibility**
- Run on edge devices
- Lower infrastructure requirements
- Better privacy (local processing)

**When to Use Small Models**

Small models excel at:
- Text classification
- Sentiment analysis
- Simple Q&A
- Entity extraction
- Basic summarization

**ReGraph's Small Model Offerings**

We offer several efficient models:
- GPT-5-nano for simple text tasks
- Gemini 2.5 Flash Lite for balanced performance
- Specialized models for specific domains

**The Future**

Expect to see more specialized small models that match or exceed large model performance on specific tasks while being dramatically more efficient.`,
    date: "2025-12-08",
    readTime: "4 min",
    category: "Industry Insights",
    image: smallModelsImg
  },
  {
    id: "8",
    title: "Introducing Batch Processing API",
    excerpt: "Process millions of requests efficiently with our new batch processing endpoints.",
    content: `We're excited to announce our new Batch Processing API, designed for high-volume AI workloads.

**Key Features**

**Asynchronous Processing**
- Submit large batches without waiting
- Receive results via webhook or polling
- Track progress in real-time

**Cost Savings**
- Up to 50% discount on batch requests
- Optimized scheduling for efficiency
- No minimum commitment

**Reliability**
- Automatic retries on failures
- Checkpoint and resume support
- Priority queuing options

**Use Cases**

Perfect for:
- Dataset labeling and annotation
- Bulk content generation
- Document processing pipelines
- Research experiments
- Data enrichment tasks

**Getting Started**

\`\`\`json
POST /v1/batch
{
  "model": "google/gemini-2.5-flash",
  "requests": [...],
  "webhook_url": "https://your-server.com/callback"
}
\`\`\`

Check our documentation for complete API reference and examples.`,
    date: "2025-11-25",
    readTime: "3 min",
    category: "Product Updates",
    image: batchProcessingImg
  },
  {
    id: "9",
    title: "AI Ethics and Responsible Development",
    excerpt: "Our commitment to ethical AI and the principles guiding ReGraph's development.",
    content: `As AI becomes more powerful, the responsibility to develop and deploy it ethically becomes more critical.

**ReGraph's Ethical Principles**

**1. Transparency**
- Clear documentation of model capabilities and limitations
- Honest communication about AI-generated content
- Open about our provider network and data practices

**2. Accessibility**
- Making AI affordable for everyone
- Supporting education and research use cases
- Building for global accessibility

**3. Safety**
- Content moderation on our platform
- Abuse prevention measures
- Collaboration with safety researchers

**4. Privacy**
- Minimal data retention
- No training on user data without consent
- Strong encryption and security practices

**5. Sustainability**
- Optimizing for energy efficiency
- Supporting carbon offset initiatives
- Promoting efficient model usage

**Developer Responsibilities**

We encourage all developers using our platform to:
- Consider the impact of their applications
- Implement appropriate safeguards
- Be transparent with their users
- Report potential misuse

**Looking Forward**

We're committed to evolving our practices as the AI landscape changes and new challenges emerge.`,
    date: "2025-11-15",
    readTime: "5 min",
    category: "Company News",
    image: aiEthicsImg
  },
  {
    id: "10",
    title: "Getting Started with ReGraph: A Complete Guide",
    excerpt: "Everything you need to know to start building with ReGraph's AI infrastructure.",
    content: `Welcome to ReGraph! This guide will walk you through everything you need to start building AI-powered applications.

**Step 1: Create Your Account**

Sign up at regraph.tech and complete the verification process. New accounts receive free credits to explore our platform.

**Step 2: Generate API Keys**

Navigate to your dashboard and create an API key. Keep it secure - it provides full access to your account.

**Step 3: Make Your First Request**

\`\`\`bash
curl https://api.regraph.tech/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "google/gemini-2.5-flash",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
\`\`\`

**Step 4: Explore Models**

Visit our Models page to browse available models. Each model has different strengths and pricing.

**Step 5: Monitor Usage**

Use the dashboard to track your usage, costs, and performance metrics.

**Next Steps**

- Read our API documentation
- Join our developer community
- Explore example projects
- Set up usage alerts

Welcome aboard!`,
    date: "2025-10-20",
    readTime: "4 min",
    category: "Education",
    image: gettingStartedImg
  },
  {
    id: "11",
    title: "ReGraph Platform Launch: A New Era of AI Infrastructure",
    excerpt: "Announcing the public launch of ReGraph - decentralized AI compute for everyone.",
    content: `Today marks a milestone in our journey: the public launch of ReGraph!

**Our Mission**

We set out to solve a fundamental problem: AI compute is too expensive and too centralized. Our solution is a decentralized network that connects developers who need AI capabilities with providers who have compute resources.

**What We're Launching**

**For Developers**
- OpenAI-compatible API
- Access to leading AI models
- Competitive pricing
- Reliable infrastructure

**For Providers**
- Easy onboarding
- Flexible commitment
- Fair compensation
- Growing demand

**Early Traction**

Since our beta:
- 500+ developers on the platform
- 1,000+ compute providers
- 10M+ API requests processed
- 99.9% uptime

**What's Next**

Our roadmap includes:
- More model options
- Enhanced batch processing
- Advanced analytics
- Enterprise features

Thank you to everyone who believed in our vision. This is just the beginning.`,
    date: "2025-09-15",
    readTime: "3 min",
    category: "Company News",
    image: platformLaunchImg,
    featured: true
  }
];

const categories = ["All", "Company News", "Models", "Industry Insights", "Development", "Education", "Product Updates"];

const Blog = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  const filteredPosts = selectedCategory === "All" 
    ? blogPosts 
    : blogPosts.filter(post => post.category === selectedCategory);

  const featuredPost = blogPosts.find(post => post.featured && post.id === "1");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-24">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">ReGraph Blog</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Insights on AI, decentralized computing, and the future of machine learning infrastructure
          </p>
        </div>

        {/* Featured Post */}
        {featuredPost && selectedCategory === "All" && (
          <Card 
            className="mb-12 cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
            onClick={() => setSelectedPost(featuredPost)}
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div className="aspect-[16/10] overflow-hidden">
                <img 
                  src={featuredPost.image} 
                  alt={featuredPost.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6 flex flex-col justify-center">
                <Badge className="w-fit mb-3">{featuredPost.category}</Badge>
                <h2 className="text-2xl md:text-3xl font-bold mb-3">{featuredPost.title}</h2>
                <p className="text-muted-foreground mb-4">{featuredPost.excerpt}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(featuredPost.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {featuredPost.readTime} read
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.filter(post => !(post.featured && post.id === "1" && selectedCategory === "All")).map(post => (
            <Card 
              key={post.id} 
              className="cursor-pointer hover:border-primary/50 transition-colors group overflow-hidden"
              onClick={() => setSelectedPost(post)}
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img 
                  src={post.image} 
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <CardHeader className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary">{post.category}</Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {post.readTime}
                  </span>
                </div>
                <CardTitle className="group-hover:text-primary transition-colors text-lg">
                  {post.title}
                </CardTitle>
                <CardDescription className="line-clamp-2">{post.excerpt}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="text-primary flex items-center gap-1 text-sm group-hover:gap-2 transition-all">
                    Read more <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Post Dialog */}
        <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            {selectedPost && (
              <div className="aspect-[16/9] overflow-hidden rounded-lg mb-4 -mx-6 -mt-6">
                <img 
                  src={selectedPost.image} 
                  alt={selectedPost.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge>{selectedPost?.category}</Badge>
                <span className="text-sm text-muted-foreground">
                  {selectedPost && new Date(selectedPost.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="text-sm text-muted-foreground">• {selectedPost?.readTime} read</span>
              </div>
              <DialogTitle className="text-2xl md:text-3xl">{selectedPost?.title}</DialogTitle>
            </DialogHeader>
            <div className="prose prose-invert max-w-none mt-4">
              {selectedPost?.content.split('\n\n').map((paragraph, index) => {
                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  return <h3 key={index} className="text-xl font-bold mt-6 mb-3">{paragraph.replace(/\*\*/g, '')}</h3>;
                }
                if (paragraph.startsWith('```')) {
                  const code = paragraph.replace(/```\w*\n?/g, '').trim();
                  return (
                    <pre key={index} className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{code}</code>
                    </pre>
                  );
                }
                if (paragraph.startsWith('- ')) {
                  const items = paragraph.split('\n').filter(line => line.startsWith('- '));
                  return (
                    <ul key={index} className="list-disc list-inside space-y-1 my-4">
                      {items.map((item, i) => (
                        <li key={i} className="text-muted-foreground">{item.replace('- ', '')}</li>
                      ))}
                    </ul>
                  );
                }
                if (/^\d+\./.test(paragraph)) {
                  const items = paragraph.split('\n').filter(line => /^\d+\./.test(line));
                  return (
                    <ol key={index} className="list-decimal list-inside space-y-1 my-4">
                      {items.map((item, i) => (
                        <li key={i} className="text-muted-foreground">{item.replace(/^\d+\.\s*/, '')}</li>
                      ))}
                    </ol>
                  );
                }
                // Handle inline bold
                const formattedText = paragraph.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i}>{part.replace(/\*\*/g, '')}</strong>;
                  }
                  return part;
                });
                return <p key={index} className="text-muted-foreground mb-4">{formattedText}</p>;
              })}
            </div>
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
