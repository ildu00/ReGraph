import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { 
  Rocket, 
  Zap, 
  Shield, 
  Database, 
  Globe, 
  Cpu,
  Wallet,
  Users,
  Code,
  Bug,
  Sparkles,
  Server,
  Lock,
  BarChart,
  MessageSquare,
  FileText,
  Settings,
  Bell,
  CreditCard,
  Smartphone
} from "lucide-react";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  type: "major" | "minor" | "patch";
  changes: {
    category: "feature" | "improvement" | "fix" | "security" | "performance";
    description: string;
  }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "2.7.0",
    date: "February 6, 2026",
    title: "API Request Logging & Observability",
    type: "minor",
    changes: [
      { category: "feature", description: "Added API request logging directly in edge functions (model-inference, models, batch, training-jobs, audio-speech, inference)" },
      { category: "feature", description: "Created shared log-request utility for fire-and-forget request logging across all backend functions" },
      { category: "feature", description: "API key prefix extraction for secure request attribution in logs" },
      { category: "improvement", description: "Frontend requests from Models Playground now appear in Admin API Logs" },
      { category: "improvement", description: "Consistent logging format with method, endpoint, status code, response time, and error messages" },
      { category: "fix", description: "Fixed missing API logs for requests bypassing the Cloudflare Worker proxy" },
    ]
  },
  {
    version: "2.6.1",
    date: "January 23, 2026",
    title: "Mobile UX & Admin Fixes",
    type: "patch",
    changes: [
      { category: "fix", description: "Fixed mobile sidebar visibility on iOS Safari using dynamic viewport height (dvh)" },
      { category: "fix", description: "Fixed admin sidebar footer (Dashboard/Sign Out) being cut off on mobile devices" },
      { category: "fix", description: "Fixed code blocks overflowing on mobile in Examples page" },
      { category: "security", description: "Added RLS policies for admins to view, update, and delete all provider devices" },
      { category: "improvement", description: "Updated team photo for Gabriel Mikhaeli on About page" },
      { category: "improvement", description: "Added safe-area-inset support for iPhone notch in admin sidebar" },
    ]
  },
  {
    version: "2.6.0",
    date: "January 22, 2026",
    title: "Examples & Ecosystem Hub",
    type: "minor",
    changes: [
      { category: "feature", description: "Unified Examples page with Code Examples and Live Projects tabs" },
      { category: "feature", description: "Added 7 ecosystem projects built on ReGraph (SpoonOS, CryptoPulse, Voice Flow, QR Wallet Pay, Ticker One, Dark Echo, Game Agents)" },
      { category: "feature", description: "Category filtering for both code examples and ecosystem projects" },
      { category: "improvement", description: "Equal-height project cards with consistent layout alignment" },
      { category: "improvement", description: "Featured project highlighting for SpoonOS with NEO partnership" },
      { category: "improvement", description: "Partnership CTA section for builders interested in ReGraph infrastructure" },
    ]
  },
  {
    version: "2.5.0",
    date: "January 21, 2026",
    title: "Admin & Navigation Improvements",
    type: "minor",
    changes: [
      { category: "feature", description: "Added Admin Panel link to dashboard sidebar for admin users" },
      { category: "feature", description: "Added Dashboard link to admin sidebar for quick navigation" },
      { category: "feature", description: "Added pagination to Boot Events with 20 items per page" },
      { category: "feature", description: "Examples page with categorized API code snippets" },
      { category: "feature", description: "Category-based filtering for code examples (Text, Image, Audio, Code, Embeddings)" },
      { category: "improvement", description: "Updated How It Works section arrows to purple color on homepage and About page" },
      { category: "improvement", description: "Repositioned step arrows to appear between cards instead of overlapping" },
      { category: "improvement", description: "Enhanced sidebar layout with flex column for proper footer positioning" },
      { category: "improvement", description: "Updated provider device statuses in database (470 online, 2 offline, 4 maintenance)" },
      { category: "fix", description: "Fixed arrow positioning in How It Works sections across all pages" },
      { category: "fix", description: "Fixed category filter functionality on Examples page" },
    ]
  },
  {
    version: "2.4.1",
    date: "January 15, 2026",
    title: "Boot Diagnostics & Monitoring",
    type: "patch",
    changes: [
      { category: "feature", description: "Added Boot Events admin page for monitoring app initialization failures" },
      { category: "feature", description: "Interactive stat cards with quick filters for mobile and storage issues" },
      { category: "feature", description: "Detailed event view dialog with diagnostic data display" },
      { category: "feature", description: "Device type detection with mobile/desktop icons" },
      { category: "improvement", description: "Multi-term search support with pipe separator for complex queries" },
      { category: "improvement", description: "Responsive refresh button with icon-only on mobile" },
      { category: "security", description: "Admin-only access to boot event logs via RLS policies" },
    ]
  },
  {
    version: "2.4.0",
    date: "January 11, 2026",
    title: "Support Center & Status Dashboard",
    type: "major",
    changes: [
      { category: "feature", description: "Added comprehensive Support Center with AI-powered assistant" },
      { category: "feature", description: "Introduced FAQ section with 10 commonly asked questions" },
      { category: "feature", description: "Added support ticket submission form with email notifications" },
      { category: "feature", description: "Chat history persistence in localStorage for AI assistant" },
      { category: "feature", description: "Full Markdown rendering support in chat responses" },
      { category: "feature", description: "Real-time incident tracking and status page updates" },
      { category: "feature", description: "Platform statistics dashboard with live device counts" },
      { category: "improvement", description: "Enhanced uptime history visualization" },
      { category: "fix", description: "Fixed scroll behavior in chat interface" },
    ]
  },
  {
    version: "2.3.0",
    date: "January 5, 2026",
    title: "Model Playground Enhancements",
    type: "major",
    changes: [
      { category: "feature", description: "Added interactive Model Playground for testing inference" },
      { category: "feature", description: "Streaming response support with real-time token display" },
      { category: "feature", description: "Model comparison feature with side-by-side outputs" },
      { category: "feature", description: "Custom system prompt configuration" },
      { category: "improvement", description: "Enhanced syntax highlighting for code responses" },
      { category: "improvement", description: "Added copy-to-clipboard for API examples" },
      { category: "performance", description: "Optimized model loading times by 40%" },
    ]
  },
  {
    version: "2.2.0",
    date: "December 28, 2025",
    title: "Wallet & Payments Overhaul",
    type: "major",
    changes: [
      { category: "feature", description: "Multi-chain wallet support (Ethereum, Polygon, Solana, BSC, Arbitrum)" },
      { category: "feature", description: "Wert integration for fiat-to-crypto purchases" },
      { category: "feature", description: "Automated deposit address generation per network" },
      { category: "feature", description: "Transaction history with detailed status tracking" },
      { category: "feature", description: "Withdrawal requests with security confirmations" },
      { category: "security", description: "Encrypted private key storage for deposit addresses" },
      { category: "security", description: "Alchemy webhooks for real-time deposit notifications" },
      { category: "improvement", description: "Real-time crypto price feeds integration" },
    ]
  },
  {
    version: "2.1.0",
    date: "December 15, 2025",
    title: "Provider Dashboard & Device Management",
    type: "major",
    changes: [
      { category: "feature", description: "Hardware provider registration and verification system" },
      { category: "feature", description: "Device management dashboard for GPU, TPU, NPU, CPU, and smartphones" },
      { category: "feature", description: "Real-time device status monitoring (online/offline/maintenance)" },
      { category: "feature", description: "Earnings tracking and payout management for providers" },
      { category: "feature", description: "Connection key generation for device authentication" },
      { category: "feature", description: "Shell and PowerShell installation scripts for providers" },
      { category: "feature", description: "Docker Compose configuration for containerized deployment" },
      { category: "improvement", description: "Provider profile customization options" },
    ]
  },
  {
    version: "2.0.0",
    date: "December 1, 2025",
    title: "Platform 2.0 - Complete Redesign",
    type: "major",
    changes: [
      { category: "feature", description: "Complete UI/UX redesign with dark theme" },
      { category: "feature", description: "New landing page with animated hero section" },
      { category: "feature", description: "Interactive features showcase with hover effects" },
      { category: "feature", description: "Comparison section highlighting platform advantages" },
      { category: "feature", description: "Responsive design for mobile and tablet devices" },
      { category: "improvement", description: "New typography system with JetBrains Mono and Inter fonts" },
      { category: "improvement", description: "Enhanced color palette with primary purple accent" },
      { category: "improvement", description: "Smooth scroll animations throughout the site" },
      { category: "performance", description: "Reduced initial bundle size by 35%" },
    ]
  },
  {
    version: "1.9.0",
    date: "November 20, 2025",
    title: "API Documentation Hub",
    type: "major",
    changes: [
      { category: "feature", description: "Comprehensive API documentation with code examples" },
      { category: "feature", description: "Interactive API playground for testing endpoints" },
      { category: "feature", description: "Multi-language code snippets (cURL, Python, JavaScript, Go)" },
      { category: "feature", description: "Authentication guide with API key management" },
      { category: "feature", description: "Rate limiting documentation and best practices" },
      { category: "feature", description: "Batch processing API documentation" },
      { category: "improvement", description: "Collapsible sidebar navigation for docs" },
      { category: "improvement", description: "Syntax highlighting with custom theme" },
    ]
  },
  {
    version: "1.8.0",
    date: "November 8, 2025",
    title: "Usage Analytics & Billing",
    type: "major",
    changes: [
      { category: "feature", description: "Detailed usage analytics dashboard" },
      { category: "feature", description: "Daily, weekly, and monthly usage charts" },
      { category: "feature", description: "Cost breakdown by model and endpoint" },
      { category: "feature", description: "Usage alerts and budget limits" },
      { category: "feature", description: "Exportable usage reports (CSV, JSON)" },
      { category: "improvement", description: "Real-time usage tracking with live updates" },
      { category: "fix", description: "Fixed timezone issues in usage timestamps" },
    ]
  },
  {
    version: "1.7.0",
    date: "October 25, 2025",
    title: "API Key Management",
    type: "minor",
    changes: [
      { category: "feature", description: "Multiple API key support per account" },
      { category: "feature", description: "API key naming and organization" },
      { category: "feature", description: "Key rotation and revocation capabilities" },
      { category: "feature", description: "Last used timestamp tracking" },
      { category: "security", description: "Secure key hashing with prefix-only storage" },
      { category: "security", description: "Key activity audit logging" },
    ]
  },
  {
    version: "1.6.0",
    date: "October 12, 2025",
    title: "Model Catalog Expansion",
    type: "major",
    changes: [
      { category: "feature", description: "Added support for Llama 3.3 70B model" },
      { category: "feature", description: "Integrated Mistral Large 2 (123B parameters)" },
      { category: "feature", description: "DeepSeek V3 model availability" },
      { category: "feature", description: "Qwen 2.5 Coder models for code generation" },
      { category: "feature", description: "Model filtering by capability (chat, code, vision)" },
      { category: "improvement", description: "Detailed model cards with pricing information" },
      { category: "improvement", description: "Context length and token limit display" },
    ]
  },
  {
    version: "1.5.0",
    date: "September 28, 2025",
    title: "Authentication System",
    type: "major",
    changes: [
      { category: "feature", description: "Email-based authentication with magic links" },
      { category: "feature", description: "User profile creation and management" },
      { category: "feature", description: "Session persistence across browser tabs" },
      { category: "feature", description: "Automatic wallet creation for new users" },
      { category: "security", description: "Rate limiting on authentication endpoints" },
      { category: "security", description: "Email verification requirement" },
      { category: "fix", description: "Fixed session refresh token handling" },
    ]
  },
  {
    version: "1.4.0",
    date: "September 15, 2025",
    title: "Dashboard Foundation",
    type: "major",
    changes: [
      { category: "feature", description: "User dashboard with tabbed navigation" },
      { category: "feature", description: "Overview tab with quick stats and actions" },
      { category: "feature", description: "Deep-linking support for dashboard tabs" },
      { category: "feature", description: "Responsive sidebar for mobile devices" },
      { category: "improvement", description: "Smooth tab transitions with animations" },
      { category: "improvement", description: "Persistent tab state in URL" },
    ]
  },
  {
    version: "1.3.0",
    date: "September 1, 2025",
    title: "Inference API Launch",
    type: "major",
    changes: [
      { category: "feature", description: "OpenAI-compatible chat completions API" },
      { category: "feature", description: "Streaming response support with SSE" },
      { category: "feature", description: "Multi-model routing based on request parameters" },
      { category: "feature", description: "Request validation and error handling" },
      { category: "performance", description: "Sub-100ms routing latency" },
      { category: "performance", description: "Automatic load balancing across providers" },
    ]
  },
  {
    version: "1.2.0",
    date: "August 18, 2025",
    title: "Edge Functions Infrastructure",
    type: "minor",
    changes: [
      { category: "feature", description: "Serverless edge function deployment" },
      { category: "feature", description: "CORS configuration for cross-origin requests" },
      { category: "feature", description: "Environment variable management" },
      { category: "security", description: "JWT verification for protected endpoints" },
      { category: "improvement", description: "Automatic function scaling" },
    ]
  },
  {
    version: "1.1.0",
    date: "August 5, 2025",
    title: "Database Schema & RLS",
    type: "minor",
    changes: [
      { category: "feature", description: "Core database tables for users, wallets, and usage" },
      { category: "feature", description: "Row-level security policies for data isolation" },
      { category: "feature", description: "Automatic timestamp triggers" },
      { category: "security", description: "User data isolation with RLS" },
      { category: "improvement", description: "Optimized indexes for query performance" },
    ]
  },
  {
    version: "1.0.0",
    date: "July 20, 2025",
    title: "Initial Platform Release",
    type: "major",
    changes: [
      { category: "feature", description: "Core platform architecture and infrastructure" },
      { category: "feature", description: "Landing page with product overview" },
      { category: "feature", description: "Basic navigation and routing" },
      { category: "feature", description: "Responsive layout foundation" },
      { category: "feature", description: "Privacy Policy, Terms of Service, and Cookie Policy pages" },
    ]
  },
  {
    version: "0.9.0",
    date: "July 5, 2025",
    title: "Beta Testing Phase",
    type: "minor",
    changes: [
      { category: "feature", description: "Closed beta access for early adopters" },
      { category: "feature", description: "Feedback collection system" },
      { category: "improvement", description: "Performance monitoring setup" },
      { category: "fix", description: "Various UI/UX improvements based on feedback" },
    ]
  },
  {
    version: "0.8.0",
    date: "June 20, 2025",
    title: "Provider Network Foundation",
    type: "minor",
    changes: [
      { category: "feature", description: "Provider onboarding workflow design" },
      { category: "feature", description: "Device specification requirements" },
      { category: "feature", description: "Network topology planning" },
      { category: "improvement", description: "Documentation for hardware requirements" },
    ]
  },
  {
    version: "0.7.0",
    date: "June 5, 2025",
    title: "UI Component Library",
    type: "minor",
    changes: [
      { category: "feature", description: "Shadcn/ui component integration" },
      { category: "feature", description: "Custom button and input variants" },
      { category: "feature", description: "Card and dialog components" },
      { category: "improvement", description: "Consistent design tokens" },
      { category: "improvement", description: "Dark mode support" },
    ]
  },
  {
    version: "0.6.0",
    date: "May 25, 2025",
    title: "Development Environment",
    type: "patch",
    changes: [
      { category: "feature", description: "Vite development server configuration" },
      { category: "feature", description: "TypeScript strict mode enabled" },
      { category: "feature", description: "ESLint and Prettier setup" },
      { category: "improvement", description: "Hot module replacement optimization" },
    ]
  },
  {
    version: "0.5.0",
    date: "May 10, 2025",
    title: "Project Initialization",
    type: "patch",
    changes: [
      { category: "feature", description: "React 18 with TypeScript setup" },
      { category: "feature", description: "Tailwind CSS configuration" },
      { category: "feature", description: "React Router for navigation" },
      { category: "feature", description: "Supabase client integration" },
      { category: "feature", description: "Project structure and architecture planning" },
    ]
  },
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "feature": return <Sparkles className="w-4 h-4" />;
    case "improvement": return <Zap className="w-4 h-4" />;
    case "fix": return <Bug className="w-4 h-4" />;
    case "security": return <Shield className="w-4 h-4" />;
    case "performance": return <Rocket className="w-4 h-4" />;
    default: return <Code className="w-4 h-4" />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "feature": return "bg-green-500/10 text-green-400 border-green-500/20";
    case "improvement": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "fix": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "security": return "bg-red-500/10 text-red-400 border-red-500/20";
    case "performance": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const getVersionColor = (type: string) => {
  switch (type) {
    case "major": return "bg-primary/10 text-primary border-primary/20";
    case "minor": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "patch": return "bg-muted text-muted-foreground border-border";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const Changelog = () => {
  const totalFeatures = changelog.reduce((acc, entry) => 
    acc + entry.changes.filter(c => c.category === "feature").length, 0
  );
  const totalImprovements = changelog.reduce((acc, entry) => 
    acc + entry.changes.filter(c => c.category === "improvement").length, 0
  );
  const totalFixes = changelog.reduce((acc, entry) => 
    acc + entry.changes.filter(c => c.category === "fix").length, 0
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Changelog
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              Track all the updates, new features, and improvements we've made to ReGraph.
            </p>
            
            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <span className="text-2xl font-bold text-green-400">{totalFeatures}</span>
                <span className="text-sm text-green-400/80 ml-2">Features</span>
              </div>
              <div className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <span className="text-2xl font-bold text-blue-400">{totalImprovements}</span>
                <span className="text-sm text-blue-400/80 ml-2">Improvements</span>
              </div>
              <div className="px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <span className="text-2xl font-bold text-orange-400">{totalFixes}</span>
                <span className="text-sm text-orange-400/80 ml-2">Bug Fixes</span>
              </div>
              <div className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
                <span className="text-2xl font-bold text-primary">{changelog.length}</span>
                <span className="text-sm text-primary/80 ml-2">Releases</span>
              </div>
            </div>
          </motion.div>

          {/* Timeline */}
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-1/2" />

            {changelog.map((entry, index) => (
              <motion.div
                key={entry.version}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`relative mb-12 ${
                  index % 2 === 0 ? "md:pr-1/2 md:text-right" : "md:pl-1/2 md:ml-auto"
                }`}
              >
                {/* Timeline dot */}
                <div className={`absolute left-0 md:left-1/2 w-3 h-3 rounded-full bg-primary border-4 border-background md:-translate-x-1/2 -translate-x-1/2`} />

                {/* Content */}
                <div className={`ml-6 md:ml-0 ${index % 2 === 0 ? "md:mr-8" : "md:ml-8"}`}>
                  <div className={`p-6 rounded-xl border border-border bg-card ${index % 2 === 0 ? "md:text-left" : ""}`}>
                    {/* Header */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge variant="outline" className={getVersionColor(entry.type)}>
                        v{entry.version}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{entry.date}</span>
                    </div>

                    <h3 className="text-xl font-semibold mb-4">{entry.title}</h3>

                    {/* Changes */}
                    <ul className="space-y-2">
                      {entry.changes.map((change, changeIndex) => (
                        <li key={changeIndex} className="flex items-start gap-2 text-left">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0 ${getCategoryColor(change.category)}`}>
                            {getCategoryIcon(change.category)}
                          </span>
                          <span className="text-sm text-muted-foreground">{change.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-16 p-6 rounded-xl border border-border bg-card"
          >
            <p className="text-muted-foreground">
              Want to see a specific feature? Have feedback?{" "}
              <a href="/support" className="text-primary hover:underline">
                Contact our team
              </a>{" "}
              and let us know!
            </p>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Changelog;
