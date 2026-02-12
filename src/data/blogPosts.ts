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
import regraphVsGonkaImg from "@/assets/blog/regraph-vs-gonka.jpg";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  readTime: string;
  category: string;
  image: string;
  featured?: boolean;
}

export const blogPosts: BlogPost[] = [
  {
    id: "12",
    slug: "regraph-vs-gonka-ai-comparative-analysis",
    title: "Comparative Analysis: ReGraph vs Gonka.AI — Why ReGraph Offers a More Mature Architecture for Decentralized AI Compute",
    excerpt: "A detailed comparison across 12 key criteria showing why ReGraph's hybrid architecture delivers a more practical, secure, and production-ready approach to decentralized AI compute.",
    content: `As demand for AI compute resources grows rapidly, both ReGraph and Gonka.AI offer decentralized solutions for aggregating computational power. However, their architectural approaches, economic models, and adoption strategies differ significantly. This analysis compares the two projects across 12 key criteria, demonstrating why ReGraph's architecture provides a more practical, secure, and production-ready approach to decentralized AI compute.

## 1. Architectural Maturity and Pragmatism

**ReGraph** implements a hybrid architecture with clear layer separation:

- Provider layer (device agents)
- Execution layer (containerized environments)
- Orchestrator and marketplace (centralized for reliability)
- Model registry with authenticity verification
- Economic layer with off-chain micropayments

The key advantage is **pragmatic decentralization** — the project starts with a managed centralized orchestrator to ensure SLAs and compliance, with a phased transition to decentralization as the technology matures.

**Gonka.AI** relies on a fully decentralized blockchain architecture with a novel "Sprint" consensus mechanism (Transformer-based PoW). While the concept is innovative, it creates fundamental limitations:

| Parameter | ReGraph | Gonka.AI | ReGraph Advantage |
|-----------|---------|----------|-------------------|
| Cold-start time | Warm pools with pre-loaded models in strategic regions | No pre-loading mechanism | **Up to 60× latency reduction** for interactive scenarios |
| Architectural flexibility | Clear separation of concerns enables isolated compliance policies | Consensus tied to compute cycles (every k×n blocks) | **Operational flexibility** without blockchain-cycle dependency |
| Heterogeneous device support | 476+ specialized GPU nodes + distributed devices worldwide | Oriented toward devices capable of performing "sprints" | **Broader compute provider base** |

## 2. Security and Enterprise Compliance

**ReGraph** offers a multi-layered security model critical for enterprise adoption:

- **Encryption**: End-to-end encryption (E2EE) with optional TEE support (Intel SGX, AMD SEV)
- **Isolation**: Multi-layer isolation (containers → virtualization → TEE depending on requirements)
- **Compliance**: SOC2-ready, GDPR compliance mechanisms (data residency, DPA)
- **Private pools**: On-premise controller deployment for regulatory data processing

**Gonka.AI** is limited to:

- Basic cryptographic transaction protection
- No explicit GDPR/SOC2 compliance mechanisms
- No support for private pools with local policies

> **Conclusion**: ReGraph provides a **path to enterprise adoption** through security standards compliance and flexible deployment models. For regulated industries (healthcare, finance), this is critical — without these mechanisms, Gonka.AI cannot attract enterprise clients.

## 3. Economic Model and Incentive Efficiency

| Aspect | ReGraph | Gonka.AI | Analysis |
|--------|---------|----------|----------|
| Reward structure | Direct payment for work + optional RGT token for governance | Dual system: GNK emission (Bitcoin-style) + payment for work | **ReGraph avoids inflationary pressure** from token emission, ensuring stable economics |
| Micropayments | Off-chain state channels with payment aggregation (daily/weekly) | On-chain transactions with dynamic pricing (inspired by EIP-1559) | **ReGraph reduces costs by 99%+** through off-chain micropayment processing |
| Resource allocation | Market pricing with spot/reserved capacity support | Distribution proportional to voting weight from "sprint" | **Pricing flexibility** in ReGraph better matches real market needs |
| "Cold period" support | Natural price reduction during low demand | "Dummy tasks" to maintain utilization | **ReGraph avoids artificial load**, saving provider resources |

A key problem with Gonka.AI: the requirement to perform "sprints" every *k×n* blocks creates **periodic network load** that doesn't correlate with actual compute demand. This reduces resource efficiency during low user activity periods.

## 4. Result Verification and Fraud Prevention

**ReGraph** applies a multi-layered approach:

- Cross-validation for high-risk tasks
- Reputation system based on historical QoS metrics
- Optional staking with slashing mechanisms
- Deterministic logs for dispute resolution

**Gonka.AI** relies on:

- Random task verification (1 in 10–20 tasks)
- Statistical approach to fraud detection (due to non-deterministic AI inference across devices)
- Reputation reset to zero upon violation detection

> **Critical vulnerability in Gonka.AI**: The statistical approach to verification creates **false positive risks**, especially for models with non-deterministic inference. The documentation explicitly states: *"punishment is reserved for Hosts that consistently exceed an acceptable error threshold rather than being triggered by a single mistake."* This creates uncertainty for compute providers and reduces income predictability.

ReGraph provides a **more predictable and transparent verification system** through a combination of technical checks and reputation metrics without statistical uncertainty.

## 5. Model Training Support

**ReGraph**:

- Distributed training support through model sharding
- Quantization (8-bit, 4-bit) and kernel-level optimizations (TensorRT, ONNX Runtime)
- Adaptive precision based on SLA requirements

**Gonka.AI**:

- DiLoCo integration with on-chain synchronization coordination
- Sharding support through combination with approaches like GShard/DiPaCo
- "Proof-of-Learning" for training step verification

> **ReGraph's advantage**: While Gonka.AI's training architecture is technically interesting, it **heavily depends on reliable on-chain coordination**, creating a bottleneck for scaling. ReGraph uses proven approaches to distributed training without blockchain transaction dependency, ensuring **higher performance and predictability**.

## 6. Production Readiness

| Criterion | ReGraph | Gonka.AI | Assessment |
|-----------|---------|----------|------------|
| SLA | 99.9% uptime for control plane; redundancy for critical workloads | No specific SLAs mentioned | **ReGraph provides measurable guarantees** |
| Warm pools | Pre-loaded model support for latency reduction | Absent | **Critical for interactive scenarios** (chatbots, AR/VR) |
| Monitoring & observability | Full telemetry system, cost budgeting, alerting | Basic reputation system | **ReGraph's operational maturity is higher** |
| Enterprise support | Private pools, hybrid modes, compliance | Absent | **ReGraph is oriented toward commercial deployment** |

As stated in ReGraph's documentation: *"Production readiness: features such as warm pools, autoscaling, encryption, and isolated execution support real-world deployments with 99.9% uptime SLAs"* — the project is explicitly designed for real workloads, not just conceptual demonstration.

## 7. Approach to Decentralization: Pragmatism vs Idealism

**The key philosophical difference**:

- **ReGraph**: *"Incremental decentralization: Start with pragmatic centralized orchestrator elements for operational control, with a roadmap toward decentralized components and governance"* — acknowledging that full decentralization at early stages creates operational and regulatory risks.

- **Gonka.AI**: Full decentralization from the start through blockchain architecture.

> **Why ReGraph's pragmatism is preferable**: As noted in ReGraph's documentation: *"Purely decentralized systems risk safety and enterprise adoption; fully centralized approaches lose the benefits of distributed supply. ReGraph adopts a pragmatic hybrid pathway."* This approach enables:
> 1. Attracting first enterprise clients through compliance
> 2. Providing predictable SLAs for critical workloads
> 3. Gradually decentralizing components as technology matures
> 4. Avoiding regulatory risks associated with fully decentralized financial flows

## 8. Pricing and Competitive Advantages

Inference pricing comparison (January 2026, illustrative data from documentation):

| Provider | Cost per inference | Cost per GPU/hour |
|----------|--------------------|-------------------|
| **ReGraph (public)** | **$0.0001** | **$0.15** |
| AWS SageMaker | $0.0023 | $3.06 |
| Google Cloud | $0.0020 | $2.48 |
| RunPod | $0.0003 | $0.44 |
| Gonka.AI | Not specified | Not specified |

> **ReGraph's advantage**: Even without considering Gonka.AI's innovative consensus, ReGraph demonstrates **competitive pricing** with a transparent structure. Moreover, model flexibility (spot vs reserved) allows cost optimization for different use cases — something absent from Gonka.AI's documentation.

## Conclusion: Why ReGraph Represents a More Mature Solution

ReGraph surpasses Gonka.AI across the following critical parameters:

1. **Operational maturity**: Hybrid architecture with clear SLAs and reliability mechanisms makes the project production-ready today.

2. **Enterprise compliance**: SOC2, GDPR support, private pools, and on-premise deployments open access to regulated industries — a key market for scaling.

3. **Economic efficiency**: Off-chain micropayments and market pricing reduce costs and ensure predictability for both sides of the marketplace.

4. **Pragmatic approach to decentralization**: Acknowledging the need for centralized elements at early stages avoids the operational and regulatory traps that fully decentralized projects fall into.

5. **Flexibility for diverse use cases**: Warm pools, model sharding, quantization, and heterogeneous device support cover a wide spectrum of workloads — from interactive inference to distributed training.

While Gonka.AI's "Sprint" consensus mechanism represents an interesting research concept, its dependency on blockchain cycles creates fundamental limitations for performance and predictability. In a market that demands **practical, secure, and cost-effective solutions today**, ReGraph's architecture offers a more balanced and achievable path to decentralized AI compute.

> **Final assessment**: ReGraph is a solution designed for the real world with its regulatory requirements, reliability needs, and diverse use cases. Gonka.AI is a research project with innovative consensus but significant barriers to commercial adoption in the near term. For developers and enterprises seeking a production-ready solution to reduce AI compute costs, ReGraph represents a significantly more attractive option.`,
    date: "2026-02-12",
    readTime: "12 min",
    category: "Industry Insights",
    image: regraphVsGonkaImg,
    featured: true
  },
  {
    id: "1",
    slug: "future-of-decentralized-ai-inference",
    title: "The Future of Decentralized AI Inference",
    excerpt: "How distributed computing is reshaping the AI landscape and why ReGraph is at the forefront of this revolution.",
    content: `The AI industry is undergoing a fundamental transformation. As models grow larger and more capable, the centralized infrastructure that powers them is struggling to keep up with demand. This is where decentralized AI inference comes in.

## The Problem with Centralized AI

Traditional AI infrastructure relies on massive data centers owned by a handful of tech giants. This creates several issues:
- High costs that get passed on to developers
- Single points of failure
- Geographic limitations and latency issues
- Limited access for smaller organizations

## ReGraph's Decentralized Approach

At ReGraph, we're building a distributed network of compute providers that includes everything from enterprise GPUs to consumer devices. This approach offers:

1. **Cost Efficiency**: By utilizing idle compute resources, we can offer inference at a fraction of traditional costs.
2. **Resilience**: No single point of failure means higher uptime and reliability.
3. **Global Coverage**: Providers worldwide mean lower latency for users everywhere.
4. **Democratized Access**: Anyone can access powerful AI models without massive infrastructure investments.

## Looking Ahead

As we enter 2026, the demand for AI compute will only grow. Decentralized networks like ReGraph are positioned to meet this demand while keeping AI accessible to everyone.`,
    date: "2026-01-11",
    readTime: "5 min",
    category: "Industry Insights",
    image: decentralizedAiImg,
    featured: true
  },
  {
    id: "2",
    slug: "gpt5-new-era-reasoning-models",
    title: "GPT-5 and the New Era of Reasoning Models",
    excerpt: "OpenAI's latest model brings unprecedented reasoning capabilities. Here's what it means for developers.",
    content: `OpenAI's GPT-5 represents a significant leap in AI capabilities, particularly in reasoning and complex problem-solving.

## What Makes GPT-5 Different

Unlike its predecessors, GPT-5 demonstrates:
- Enhanced multi-step reasoning
- Improved accuracy on complex mathematical problems
- Better understanding of nuanced context
- More reliable code generation

## Performance on ReGraph

Since adding GPT-5 to our model catalog, we've seen remarkable adoption. Developers are using it for:
- Complex data analysis pipelines
- Advanced code review and generation
- Scientific research assistance
- Legal document analysis

## Cost Considerations

While GPT-5 is more expensive per token than smaller models, its improved accuracy often means fewer iterations and corrections, potentially lowering total costs for complex tasks.

## Best Practices

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
    slug: "gemini-3-pro-google-multimodal-ai",
    title: "Gemini 3 Pro: Google's Next-Gen Multimodal AI",
    excerpt: "Google's Gemini 3 Pro brings impressive improvements in multimodal understanding and generation.",
    content: `Google's Gemini 3 Pro represents the next evolution in multimodal AI, building on the strong foundation of Gemini 2.5.

## Key Improvements

Gemini 3 Pro offers significant advances:
- **Better Vision Understanding**: More accurate image analysis and object recognition
- **Improved Reasoning**: Enhanced logical reasoning across modalities
- **Faster Response Times**: Optimized architecture for lower latency
- **Extended Context**: Handle longer documents and conversations

## Image Generation with Gemini 3

The new Gemini 3 Pro Image Preview model offers:
- Higher resolution outputs
- Better prompt adherence
- More consistent style across generations
- Improved handling of complex scenes

## Integration with ReGraph

We've fully integrated Gemini 3 Pro into our inference pipeline. Developers can access it through our standard API with no additional configuration required.

## Use Cases

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
    slug: "building-ai-applications-best-practices-2026",
    title: "Building AI Applications: Best Practices for 2026",
    excerpt: "Essential patterns and practices for developing robust AI-powered applications in the modern era.",
    content: `As AI becomes more integrated into software applications, developers need to adopt best practices that ensure reliability, cost-efficiency, and user satisfaction.

## 1. Model Selection Strategy

Not every task requires the most powerful model:
- Use lightweight models (GPT-5-nano, Gemini Flash Lite) for simple classifications
- Reserve powerful models for complex reasoning tasks
- Implement fallback chains for reliability

## 2. Prompt Engineering

Effective prompts are crucial:
- Be specific and provide context
- Use structured output formats (JSON)
- Include examples when possible
- Test and iterate systematically

## 3. Error Handling

AI systems can fail in unexpected ways:
- Implement graceful degradation
- Add retry logic with exponential backoff
- Monitor for quality degradation over time
- Have human review processes for critical decisions

## 4. Cost Management

Control your AI spending:
- Cache responses when appropriate
- Batch similar requests together
- Use streaming for long responses
- Monitor token usage closely

## 5. Security Considerations

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
    slug: "regraph-network-10000-providers-milestone",
    title: "ReGraph Network: 10,000 Active Providers Milestone",
    excerpt: "Our decentralized compute network reaches a major milestone with providers spanning 50+ countries.",
    content: `We're thrilled to announce that ReGraph has reached 10,000 active compute providers on our network!

## Global Reach

Our provider network now spans:
- 50+ countries across 6 continents
- Over 15,000 GPUs available for inference
- 2,500+ TPU and NPU devices
- Growing smartphone compute network

## What This Means for Developers

With our expanded network:
- **Lower Latency**: Regional providers mean faster responses
- **Higher Availability**: More redundancy for critical workloads
- **Better Pricing**: Competition drives costs down
- **More Capacity**: Handle larger batch jobs efficiently

## Provider Success Stories

We've seen incredible stories from our providers:
- Research labs monetizing idle GPU time
- Gaming cafes earning during off-hours
- Data centers adding new revenue streams
- Individual enthusiasts contributing to AI accessibility

## Looking Forward

Our goal for 2026 is to reach 50,000 providers and add support for new hardware types including the latest NVIDIA and AMD GPUs.`,
    date: "2025-12-20",
    readTime: "3 min",
    category: "Company News",
    image: providerMilestoneImg
  },
  {
    id: "6",
    slug: "understanding-ai-model-benchmarks",
    title: "Understanding AI Model Benchmarks",
    excerpt: "A comprehensive guide to interpreting AI model benchmarks and choosing the right model for your needs.",
    content: `With dozens of AI models available, understanding benchmarks is essential for making informed choices.

## Common Benchmark Categories

### Reasoning Benchmarks
- MMLU (Massive Multitask Language Understanding)
- ARC (AI2 Reasoning Challenge)
- HellaSwag
- GSM8K (Grade School Math)

### Coding Benchmarks
- HumanEval
- MBPP (Mostly Basic Python Problems)
- CodeContests

### Multimodal Benchmarks
- MMMU (Massive Multi-discipline Multimodal Understanding)
- VQAv2 (Visual Question Answering)
- TextVQA

## Beyond Benchmarks

While benchmarks are useful, they don't tell the whole story:
- Real-world performance may differ
- Latency and cost matter too
- Some tasks don't have good benchmarks
- Model behavior on edge cases varies

## Practical Recommendations

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
    slug: "rise-of-small-language-models",
    title: "The Rise of Small Language Models",
    excerpt: "Why smaller, specialized models are becoming increasingly important in the AI ecosystem.",
    content: `While headlines focus on ever-larger models, there's a quiet revolution happening with smaller, more efficient AI models.

## Why Small Models Matter

### Cost Efficiency
- 10-100x cheaper per request
- Sustainable for high-volume applications
- Accessible to startups and individuals

### Speed
- Millisecond response times
- Better for real-time applications
- Improved user experience

### Deployment Flexibility
- Run on edge devices
- Lower infrastructure requirements
- Better privacy (local processing)

## When to Use Small Models

Small models excel at:
- Text classification
- Sentiment analysis
- Simple Q&A
- Entity extraction
- Basic summarization

## ReGraph's Small Model Offerings

We offer several efficient models:
- GPT-5-nano for simple text tasks
- Gemini 2.5 Flash Lite for balanced performance
- Specialized models for specific domains

## The Future

Expect to see more specialized small models that match or exceed large model performance on specific tasks while being dramatically more efficient.`,
    date: "2025-12-08",
    readTime: "4 min",
    category: "Industry Insights",
    image: smallModelsImg
  },
  {
    id: "8",
    slug: "introducing-batch-processing-api",
    title: "Introducing Batch Processing API",
    excerpt: "Process millions of requests efficiently with our new batch processing endpoints.",
    content: `We're excited to announce our new Batch Processing API, designed for high-volume AI workloads.

## Key Features

### Asynchronous Processing
- Submit large batches without waiting
- Receive results via webhook or polling
- Track progress in real-time

### Cost Savings
- Up to 50% discount on batch requests
- Optimized scheduling for efficiency
- No minimum commitment

### Reliability
- Automatic retries on failures
- Checkpoint and resume support
- Priority queuing options

## Use Cases

Perfect for:
- Dataset labeling and annotation
- Bulk content generation
- Document processing pipelines
- Research experiments
- Data enrichment tasks

## Getting Started

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
    slug: "ai-ethics-responsible-development",
    title: "AI Ethics and Responsible Development",
    excerpt: "Our commitment to ethical AI and the principles guiding ReGraph's development.",
    content: `As AI becomes more powerful, the responsibility to develop and deploy it ethically becomes more critical.

## ReGraph's Ethical Principles

### 1. Transparency
- Clear documentation of model capabilities and limitations
- Honest communication about AI-generated content
- Open about our provider network and data practices

### 2. Accessibility
- Making AI affordable for everyone
- Supporting education and research use cases
- Building for global accessibility

### 3. Safety
- Content moderation on our platform
- Abuse prevention measures
- Collaboration with safety researchers

### 4. Privacy
- Minimal data retention
- No training on user data without consent
- Strong encryption and security practices

### 5. Sustainability
- Optimizing for energy efficiency
- Supporting carbon offset initiatives
- Promoting efficient model usage

## Developer Responsibilities

We encourage all developers using our platform to:
- Consider the impact of their applications
- Implement appropriate safeguards
- Be transparent with their users
- Report potential misuse

## Looking Forward

We're committed to evolving our practices as the AI landscape changes and new challenges emerge.`,
    date: "2025-11-15",
    readTime: "5 min",
    category: "Company News",
    image: aiEthicsImg
  },
  {
    id: "10",
    slug: "getting-started-with-regraph-complete-guide",
    title: "Getting Started with ReGraph: A Complete Guide",
    excerpt: "Everything you need to know to start building with ReGraph's AI infrastructure.",
    content: `Welcome to ReGraph! This guide will walk you through everything you need to start building AI-powered applications.

## Step 1: Create Your Account

Sign up at regraph.tech and complete the verification process. New accounts receive free credits to explore our platform.

## Step 2: Generate API Keys

Navigate to your dashboard and create an API key. Keep it secure - it provides full access to your account.

## Step 3: Make Your First Request

\`\`\`bash
curl https://api.regraph.tech/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "google/gemini-2.5-flash",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
\`\`\`

## Step 4: Explore Models

Visit our Models page to browse available models. Each model has different strengths and pricing.

## Step 5: Monitor Usage

Use the dashboard to track your usage, costs, and performance metrics.

## Next Steps

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
    slug: "regraph-platform-launch-new-era",
    title: "ReGraph Platform Launch: A New Era of AI Infrastructure",
    excerpt: "Announcing the public launch of ReGraph - decentralized AI compute for everyone.",
    content: `Today marks a milestone in our journey: the public launch of ReGraph!

## Our Mission

We set out to solve a fundamental problem: AI compute is too expensive and too centralized. Our solution is a decentralized network that connects developers who need AI capabilities with providers who have compute resources.

## What We're Launching

### For Developers
- OpenAI-compatible API
- Access to leading AI models
- Competitive pricing
- Reliable infrastructure

### For Providers
- Easy onboarding
- Flexible commitment
- Fair compensation
- Growing demand

## Early Traction

Since our beta:
- 500+ developers on the platform
- 1,000+ compute providers
- 10M+ API requests processed
- 99.9% uptime

## What's Next

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

export const categories = ["All", "Company News", "Models", "Industry Insights", "Development", "Education", "Product Updates"];
