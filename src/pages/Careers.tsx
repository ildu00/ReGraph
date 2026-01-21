import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { 
  Briefcase, 
  Heart, 
  Rocket, 
  Users, 
  Send, 
  Loader2,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  Building2,
  Globe,
  Code,
  Headphones,
  Megaphone,
  Scale,
  Shield,
  Settings
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type JobPosition = {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  segment: "B2B" | "B2G" | "B2C" | "Cross-functional";
  icon: React.ElementType;
  description: string;
  responsibilities: string[];
  requirements: string[];
};

const Careers = () => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<string>("all");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    position: "",
    message: ""
  });

  const benefits = [
    {
      icon: Rocket,
      title: "Cutting-Edge Technology",
      description: "Work on revolutionary decentralized AI infrastructure"
    },
    {
      icon: Users,
      title: "Global Team",
      description: "Collaborate with talented professionals worldwide"
    },
    {
      icon: Heart,
      title: "Work-Life Balance",
      description: "Flexible remote-first culture with async communication"
    },
    {
      icon: Briefcase,
      title: "Growth Opportunities",
      description: "Continuous learning and career development support"
    }
  ];

  const positions: JobPosition[] = [
    // Core Leadership & BD
    {
      id: "head-bd",
      title: "Head of Business Development & Partnerships",
      department: "Business Development",
      location: "Remote (Global)",
      type: "Full-time",
      segment: "Cross-functional",
      icon: Building2,
      description: "Lead strategic partnerships and key negotiations across B2B and B2G segments. Own the pipeline and drive revenue growth through enterprise deals.",
      responsibilities: [
        "Develop and execute partnership strategy across ML platforms, crypto exchanges, and enterprise clients",
        "Lead negotiations for strategic deals with companies like Hugging Face, Replicate, 1inch, LayerZero",
        "Build relationships with cloud GPU providers (CoreWeave, Scaleway, Genesis Cloud)",
        "Own the sales pipeline and forecasting for enterprise segment",
        "Collaborate with Product and Engineering to align customer needs with roadmap"
      ],
      requirements: [
        "7+ years in B2B sales/partnerships, preferably in AI/ML infrastructure or crypto",
        "Proven track record closing $100k+ enterprise deals",
        "Strong network in ML/AI or DeFi ecosystems",
        "Experience with SaaS, infrastructure-as-a-service, or revenue-share models",
        "Excellent negotiation and presentation skills"
      ]
    },
    {
      id: "sales-director",
      title: "Sales Director / Account Executive",
      department: "Sales",
      location: "Remote (EU/US timezone preferred)",
      type: "Full-time",
      segment: "B2B",
      icon: Briefcase,
      description: "Drive enterprise sales for our inference infrastructure and bridge/swap solutions. Manage the full sales cycle from qualification to close.",
      responsibilities: [
        "Manage enterprise sales cycles for ML platforms, DEX aggregators, and bridge providers",
        "Develop account plans for target companies (Stability AI, Lambda Labs, Banana.dev, etc.)",
        "Negotiate contracts: SaaS subscriptions, per-inference pricing, revenue-share agreements",
        "Collaborate with Solutions Engineers on technical demos and PoC delivery",
        "Achieve quarterly revenue targets and maintain accurate pipeline forecasting"
      ],
      requirements: [
        "5+ years B2B sales experience in tech/SaaS/infrastructure",
        "Experience selling to technical buyers (CTOs, Heads of Infrastructure)",
        "Track record of $50k-500k ARR deals",
        "Understanding of cloud computing, ML/AI, or blockchain infrastructure",
        "Self-motivated with strong closing skills"
      ]
    },
    {
      id: "sdr",
      title: "Sales Development Representative (SDR)",
      department: "Sales",
      location: "Remote",
      type: "Full-time",
      segment: "B2B",
      icon: Megaphone,
      description: "Generate and qualify leads for our B2B sales team. Be the first point of contact for potential enterprise customers.",
      responsibilities: [
        "Execute outbound campaigns targeting ML platforms, crypto exchanges, and cloud providers",
        "Research and build target lists using LinkedIn Sales Navigator, Clearbit, Hunter.io",
        "Qualify leads using BANT framework (Budget, Authority, Need, Timeline)",
        "Book discovery calls and demos for Account Executives",
        "Maintain accurate CRM records and provide pipeline insights"
      ],
      requirements: [
        "1-3 years in SDR/BDR role, preferably in tech or SaaS",
        "Experience with outbound prospecting (email, LinkedIn, cold calling)",
        "Familiarity with CRM tools (HubSpot, Salesforce)",
        "Strong written and verbal communication skills",
        "Interest in AI/ML, blockchain, or distributed systems"
      ]
    },
    {
      id: "solutions-engineer",
      title: "Solutions Engineer / Technical Sales",
      department: "Sales Engineering",
      location: "Remote",
      type: "Full-time",
      segment: "B2B",
      icon: Code,
      description: "Bridge the gap between sales and engineering. Lead technical demonstrations, PoC implementations, and architecture workshops.",
      responsibilities: [
        "Conduct technical discovery calls and architecture workshops with prospects",
        "Design and deliver PoC implementations (2-4 week scope)",
        "Create benchmarks: latency comparisons, cost-per-inference analysis, throughput tests",
        "Support SDK integration and provide technical documentation",
        "Collaborate with Product team on feature requests from enterprise customers"
      ],
      requirements: [
        "3+ years in Solutions Engineering, Sales Engineering, or technical consulting",
        "Strong programming skills (Python, TypeScript, Go)",
        "Experience with ML frameworks (TensorFlow, PyTorch, ONNX) or blockchain development",
        "Ability to explain complex technical concepts to non-technical stakeholders",
        "Experience with cloud platforms (AWS, GCP, Azure) and container technologies"
      ]
    },
    {
      id: "csm",
      title: "Customer Success Manager",
      department: "Customer Success",
      location: "Remote",
      type: "Full-time",
      segment: "Cross-functional",
      icon: Headphones,
      description: "Ensure customer satisfaction from onboarding through renewal. Drive adoption, monitor health metrics, and expand accounts.",
      responsibilities: [
        "Own customer onboarding: setup monitoring, integration support, SLA management",
        "Conduct regular check-ins and business reviews with key accounts",
        "Monitor customer health metrics and proactively address issues",
        "Identify expansion opportunities and collaborate with Sales on upsells",
        "Gather feedback and advocate for customer needs with Product team"
      ],
      requirements: [
        "3+ years in Customer Success, Account Management, or similar role",
        "Experience with technical products (SaaS, infrastructure, developer tools)",
        "Strong relationship-building and communication skills",
        "Data-driven approach to customer health monitoring",
        "Ability to work with technical teams and understand API/SDK integrations"
      ]
    },
    {
      id: "devrel",
      title: "Developer Relations Engineer",
      department: "Developer Relations",
      location: "Remote",
      type: "Full-time",
      segment: "B2C",
      icon: Code,
      description: "Build and nurture our developer community. Create SDKs, documentation, and educational content. Represent ReGraph at conferences and hackathons.",
      responsibilities: [
        "Develop and maintain SDKs (Python, JavaScript, Go, Ruby)",
        "Create technical documentation, tutorials, and sample applications",
        "Organize and participate in hackathons, conferences, and developer events",
        "Build community through Discord, Telegram, GitHub, and social media",
        "Gather developer feedback and work with Product on DX improvements"
      ],
      requirements: [
        "3+ years as Developer Advocate, DevRel, or Software Engineer",
        "Strong programming skills in multiple languages",
        "Experience creating technical content (docs, blogs, videos)",
        "Public speaking experience or strong desire to develop it",
        "Active presence in developer communities (open source contributions a plus)"
      ]
    },
    {
      id: "product-manager",
      title: "Product Manager",
      department: "Product",
      location: "Remote",
      type: "Full-time",
      segment: "Cross-functional",
      icon: Rocket,
      description: "Drive product strategy for our inference and bridge infrastructure. Translate customer needs into features and manage the product roadmap.",
      responsibilities: [
        "Define product vision and roadmap for inference/bridge platforms",
        "Gather and prioritize requirements from B2B, B2G, and B2C customers",
        "Work with Engineering to scope and deliver features",
        "Define success metrics and analyze product performance",
        "Collaborate with Sales and Marketing on go-to-market strategies"
      ],
      requirements: [
        "4+ years product management experience in tech/infrastructure",
        "Experience with developer platforms, APIs, or ML/AI products",
        "Strong analytical skills and data-driven decision making",
        "Technical background or ability to work closely with engineering teams",
        "Excellent prioritization and communication skills"
      ]
    },
    {
      id: "marketing-manager",
      title: "Marketing Manager",
      department: "Marketing",
      location: "Remote",
      type: "Full-time",
      segment: "Cross-functional",
      icon: Megaphone,
      description: "Lead marketing initiatives across B2B, B2G, and B2C segments. Generate demand, create content, and manage events.",
      responsibilities: [
        "Develop marketing materials: case studies, ROI calculators, one-pagers",
        "Plan and execute event marketing (conferences, webinars, hackathons)",
        "Manage content calendar and produce thought leadership content",
        "Run demand generation campaigns (LinkedIn, targeted ads, email)",
        "Track campaign performance and optimize based on data"
      ],
      requirements: [
        "4+ years in B2B marketing, preferably in tech or infrastructure",
        "Experience with content marketing, demand generation, and events",
        "Strong writing skills and ability to explain technical concepts",
        "Familiarity with marketing tools (HubSpot, LinkedIn Ads, Google Analytics)",
        "Interest in AI/ML, blockchain, or decentralized technologies"
      ]
    },
    // B2G Specific
    {
      id: "ae-b2g",
      title: "Account Executive – Education & Government",
      department: "Sales",
      location: "Remote (EU/CIS preferred)",
      type: "Full-time",
      segment: "B2G",
      icon: Building2,
      description: "Drive sales into universities, EdTech platforms, and government institutions. Navigate tender processes and build long-term institutional partnerships.",
      responsibilities: [
        "Develop relationships with universities, research centers, and EdTech platforms",
        "Navigate government procurement and tender processes",
        "Create proposals for on-premise and private cloud deployments",
        "Collaborate with Legal on compliance requirements and contracts",
        "Build case studies demonstrating ROI for educational use cases"
      ],
      requirements: [
        "5+ years sales experience in education, government, or public sector",
        "Experience with RFP/tender processes",
        "Understanding of data privacy regulations and compliance requirements",
        "Strong relationship-building skills with institutional stakeholders",
        "Ability to work with long sales cycles (6-12 months)"
      ]
    },
    {
      id: "legal-compliance",
      title: "Legal & Compliance Specialist",
      department: "Legal",
      location: "Remote",
      type: "Full-time / Contract",
      segment: "B2G",
      icon: Scale,
      description: "Support B2G sales with contract negotiation, tender documentation, and compliance requirements. Ensure regulatory adherence across markets.",
      responsibilities: [
        "Draft and review contracts for enterprise and government clients",
        "Prepare documentation for government tenders and RFPs",
        "Ensure compliance with data privacy regulations (GDPR, local laws)",
        "Advise on regulatory requirements for different markets",
        "Support security audits and certification processes"
      ],
      requirements: [
        "5+ years in legal/compliance, preferably in tech or government contracts",
        "Experience with government procurement and tender processes",
        "Knowledge of data privacy regulations and tech industry standards",
        "Strong contract negotiation skills",
        "Ability to work across multiple jurisdictions"
      ]
    },
    // B2C / Growth
    {
      id: "growth-lead",
      title: "Growth Lead",
      department: "Growth",
      location: "Remote",
      type: "Full-time",
      segment: "B2C",
      icon: Globe,
      description: "Drive user acquisition for our B2C products including creator tools and white-label AI apps. Execute growth experiments and scale successful channels.",
      responsibilities: [
        "Launch and optimize Product Hunt campaigns and app store presence",
        "Manage paid acquisition (Facebook, Instagram, TikTok ads)",
        "Build influencer and affiliate partnership programs",
        "Design and run growth experiments (A/B testing, viral loops)",
        "Analyze funnel metrics and optimize conversion rates"
      ],
      requirements: [
        "4+ years in growth marketing or user acquisition",
        "Experience with consumer apps or creator/social tools",
        "Strong analytical skills and experience with analytics tools",
        "Track record of scaling user acquisition channels",
        "Understanding of freemium and credit-based monetization models"
      ]
    },
    // Technical / Infrastructure
    {
      id: "security-engineer",
      title: "Security Engineer",
      department: "Engineering",
      location: "Remote",
      type: "Part-time / Contract",
      segment: "Cross-functional",
      icon: Shield,
      description: "Ensure security of our bridge infrastructure and customer integrations. Conduct audits and provide security consulting for enterprise deals.",
      responsibilities: [
        "Conduct security audits of bridge and inference infrastructure",
        "Support enterprise sales with security documentation and assessments",
        "Review smart contracts and cross-chain security implementations",
        "Develop security best practices and incident response procedures",
        "Collaborate with external auditors on certifications"
      ],
      requirements: [
        "5+ years in security engineering or auditing",
        "Experience with blockchain/DeFi security or cloud infrastructure security",
        "Knowledge of smart contract vulnerabilities and mitigation",
        "Familiarity with security frameworks and compliance standards",
        "Strong communication skills for client-facing security reviews"
      ]
    },
    {
      id: "devops",
      title: "DevOps / Infrastructure Engineer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      segment: "Cross-functional",
      icon: Settings,
      description: "Maintain and scale infrastructure for PoCs and production customers. Ensure reliability, monitoring, and smooth deployments.",
      responsibilities: [
        "Manage infrastructure for customer PoCs and production deployments",
        "Build and maintain CI/CD pipelines and deployment automation",
        "Set up monitoring, alerting, and logging (Grafana, Prometheus, Datadog)",
        "Support on-premise deployments for B2G customers",
        "Optimize infrastructure costs and performance"
      ],
      requirements: [
        "4+ years in DevOps, SRE, or Infrastructure Engineering",
        "Experience with Kubernetes, Docker, and container orchestration",
        "Proficiency with IaC tools (Terraform, Ansible)",
        "Experience with cloud platforms (AWS, GCP, Azure)",
        "Strong troubleshooting and incident response skills"
      ]
    }
  ];

  const segments = [
    { value: "all", label: "All Positions" },
    { value: "B2B", label: "B2B" },
    { value: "B2G", label: "B2G" },
    { value: "B2C", label: "B2C" },
    { value: "Cross-functional", label: "Cross-functional" }
  ];

  const filteredPositions = selectedSegment === "all" 
    ? positions 
    : positions.filter(p => p.segment === selectedSegment);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from("support_requests").insert({
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.position ? `Career Application: ${formData.position}` : "Career Inquiry",
        message: formData.message.trim(),
        user_id: user?.id || null
      });

      if (error) throw error;

      toast.success("Application submitted! We'll be in touch soon.");
      setFormData({ name: "", email: "", position: "", message: "" });
    } catch (error) {
      toast.error("Failed to send. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApply = (jobTitle: string) => {
    setFormData(prev => ({ ...prev, position: jobTitle }));
    document.getElementById("apply-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4 text-primary border-primary/30">
              Join Our Team
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Careers at <span className="text-primary">ReGraph</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We're building the future of decentralized AI infrastructure. 
              Join us in revolutionizing how the world processes and shares computational power.
            </p>
          </motion.div>

          {/* Benefits */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold text-center mb-8">Why Join ReGraph?</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Open Positions */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-16"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold">Open Positions</h2>
                <p className="text-muted-foreground">{positions.length} roles across B2B, B2G, and B2C</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {segments.map(seg => (
                  <Button
                    key={seg.value}
                    variant={selectedSegment === seg.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSegment(seg.value)}
                  >
                    {seg.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {filteredPositions.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.03 }}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  {/* Job Header */}
                  <div 
                    className="p-4 md:p-6 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <job.icon className="w-5 h-5 text-primary" />
                          </div>
                          <Badge variant="secondary" className="text-xs">{job.segment}</Badge>
                        </div>
                        {expandedJob === job.id ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      <h3 className="font-semibold text-base mb-1">{job.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{job.department}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {job.type}
                        </span>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApply(job.title);
                        }}
                      >
                        Apply Now
                      </Button>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <job.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{job.title}</h3>
                          <Badge variant="secondary" className="text-xs">{job.segment}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{job.department}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {job.type}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApply(job.title);
                          }}
                        >
                          Apply
                        </Button>
                        {expandedJob === job.id ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <div className={cn(
                    "overflow-hidden transition-all duration-300",
                    expandedJob === job.id ? "max-h-[1000px]" : "max-h-0"
                  )}>
                    <div className="px-6 pb-6 pt-2 border-t border-border">
                      <p className="text-muted-foreground mb-6">{job.description}</p>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3">Responsibilities</h4>
                          <ul className="space-y-2">
                            {job.responsibilities.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-3">Requirements</h4>
                          <ul className="space-y-2">
                            {job.requirements.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-border">
                        <Button onClick={() => handleApply(job.title)}>
                          Apply for this position
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Application Form */}
          <motion.section
            id="apply-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-8 rounded-xl border border-border bg-card scroll-mt-24"
          >
            <h2 className="text-2xl font-bold mb-2">Apply Now</h2>
            <p className="text-muted-foreground mb-6">
              Interested in joining ReGraph? Submit your application below.
            </p>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    maxLength={100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    maxLength={255}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position (optional)</Label>
                <Input
                  id="position"
                  placeholder="Which role are you applying for?"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Cover Letter / About You</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us about your experience, skills, and why you'd be a great fit for ReGraph..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={6}
                  maxLength={3000}
                  required
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Application
                  </>
                )}
              </Button>
            </form>
          </motion.section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Careers;
